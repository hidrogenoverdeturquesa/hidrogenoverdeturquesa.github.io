import copy
import json
from pathlib import Path
import subprocess
import numpy as np
import pandas as pd
import pytest
import statsmodels.formula.api as smf
from statsmodels.stats.anova import anova_lm
from fastapi.testclient import TestClient
from experimental_engine.science import design, analyze, predict, json_safe
from experimental_engine.app import app
from experimental_engine.figures import charts, static_figure

ROOT=Path(__file__).resolve().parents[2]

def data(k=2, blocking='none', seed=43):
    d=dict(factorCount=k,repetitions=3,seed=seed,blocking=blocking,blockName='Día',calculation='manual',response='Agua retenida',responseUnit='mL')
    for i in range(1,k+1):
        d.update({f'factorName{i}':f'Factor {i}',f'factorType{i}':'numeric',f'factorLow{i}':10,f'factorHigh{i}':30,f'factorUnit{i}':'g'})
    return d

def sample(k=2, blocking='none'):
    d=data(k,blocking);rows=[]
    for row in design(d)['runs']:
        codes=row['codes'];a=codes[0];b=codes[1] if k>1 else 0
        error=[-1,0,1][row['replica']-1]
        if blocking!='none':error*=a # residual orthogonal to blocks and treatment means
        y=10+2*a-3*b+1.5*a*b+error+(2*(row['replica']-2) if blocking!='none' else 0)
        rows.append(dict(run=row['run'],result=str(y),status='done',actual=[],raw=[],executionOrder=row['run']))
    return dict(design=d,observations=rows,design_version=1,dataset_version=len(rows))

@pytest.mark.parametrize('k',[1,2,3,4])
@pytest.mark.parametrize('blocking',['none','replicate'])
def test_matrix_randomization_and_js_parity(k,blocking):
    for seed in [1,43,999999]:
        d=data(k,blocking,seed);p=design(d)
        assert p==design(d)
        X=np.array([[1]+[np.prod([row['codes'][ord(c)-65] for c in term]) for term in p['terms']] for row in p['standard']])
        np.testing.assert_allclose(X.T@X,np.eye(2**k)*2**k)
        assert len(p['runs'])==3*2**k
        js="const D=require('./js/diseno-experimentos.js');const d={...D.example,...JSON.parse(process.argv[1]),feasible:true};console.log(JSON.stringify(D.generate(d).rows.map(r=>[r.run,r.condition,r.replica,r.block,r.values])));"
        expected=json.loads(subprocess.check_output(['node','-e',js,json.dumps(d)],cwd=ROOT,text=True,encoding='utf-8'))
        assert expected==[[r['run'],r['condition'],r['replica'],r['block'],r['values']] for r in p['runs']]

def test_known_coefficients_anova_and_interaction():
    result,_=analyze(sample())
    np.testing.assert_allclose([r['estimate'] for r in result['coefficients']],[10,2,-3,1.5],atol=1e-12)
    np.testing.assert_allclose([r['se'] for r in result['coefficients']],np.sqrt(1/12),atol=1e-12)
    np.testing.assert_allclose([r['effect'] for r in result['coefficients'][1:]],[4,-6,3])
    np.testing.assert_allclose([r['ss'] for r in result['anova']],[48,108,27,8,191])
    assert [r['df'] for r in result['anova']]==[1,1,1,8,11]
    assert result['summary']['r2']==pytest.approx(183/191)
    assert result['summary']['r2_adjusted']==pytest.approx(1-11/191)
    assert result['summary']['rmse']==pytest.approx(1)
    assert result['equation_real'] and result['real_variables'][0]['unit']=='g'

@pytest.mark.parametrize('k',[1,3,4])
@pytest.mark.parametrize('blocking',['none','replicate'])
def test_full_model_for_other_supported_factor_counts(k,blocking):
    result,_=analyze(sample(k,blocking))
    params=2**k+(2 if blocking=='replicate' else 0)
    assert result['summary']['parameters']==params
    assert result['summary']['df_error']==3*2**k-params
    assert result['coefficients'][0]['estimate']==pytest.approx(10)
    assert result['coefficients'][1]['estimate']==pytest.approx(2)
    assert len(result['diagnostics'])==3*2**k
    json.dumps(json_safe(result),allow_nan=False)

@pytest.mark.parametrize('blocking',['none','replicate'])
@pytest.mark.parametrize('unbalanced',[False,True])
def test_against_independent_statsmodels_formula(blocking,unbalanced):
    request=sample(blocking=blocking)
    if unbalanced:request['observations'].pop()
    result,_=analyze(request);rows={r['run']:r for r in design(request['design'])['runs']}
    frame=pd.DataFrame([dict(y=float(o['result']),x1=rows[o['run']]['codes'][0],x2=rows[o['run']]['codes'][1],block=rows[o['run']]['replica']) for o in request['observations']])
    fit=smf.ols('y ~ x1*x2'+(' + C(block, Sum)' if blocking=='replicate' else ''),frame).fit()
    ref=anova_lm(fit,typ=3)
    for row,key in zip(result['anova'][:3],['x1','x2','x1:x2']):
        for a,b in [('ss','sum_sq'),('df','df'),('f','F'),('p','PR(>F)')]:assert row[a]==pytest.approx(ref.loc[key,b],rel=1e-9,abs=1e-10)
    if blocking=='replicate':assert result['anova'][3]['ss']==pytest.approx(ref.loc['C(block, Sum)','sum_sq'])
    assert result['summary']['r2']==pytest.approx(fit.rsquared)
    assert result['summary']['df_error']==fit.df_resid
    np.testing.assert_allclose([r['fitted'] for r in result['diagnostics']],fit.fittedvalues)
    np.testing.assert_allclose([r['cooks'] for r in result['diagnostics']],fit.get_influence().cooks_distance[0],atol=1e-12)

def test_prediction_intervals_and_bounds():
    request=sample();p=predict(request,[20,20])
    assert p['mean']==pytest.approx(10)
    assert p['prediction_interval'][0]<p['mean_ci'][0]<p['mean']<p['mean_ci'][1]<p['prediction_interval'][1]
    with pytest.raises(ValueError,match='dominio'):predict(request,[31,20])
    with pytest.raises(ValueError,match='bloque'):predict(sample(blocking='replicate'),[20,20])
    assert predict(sample(blocking='replicate'),[20,20],1)['mean']==pytest.approx(8)

def test_derived_data_exclusion_keeps_original_and_hash():
    request=sample();request['design'].update(calculation='difference',rawUnit1='mL',rawUnit2='mL')
    for r in request['observations']:r['raw']=[str(100+float(r['result'])),'100']
    original=copy.deepcopy(request);result,_=analyze(request)
    assert request==original
    request['observations'][0]['exclusion']=dict(excluded=True,reason='Fuga observada',actor='Investigadora',at='2026-09-13T14:00:00Z')
    subset,_=analyze(request)
    assert subset['summary']['n']==11 and len(subset['skipped'])==1
    assert result['input_sha256']!=subset['input_sha256']
    request['observations'][0]['exclusion'].pop('reason')
    with pytest.raises(ValueError,match='exclusión'):analyze(request)

def test_reject_insufficient_rank_constant_and_zero_error():
    request=sample();request['observations']=request['observations'][:4]
    with pytest.raises(ValueError,match='insuficientes'):analyze(request)
    request=sample();plan=design(request['design']);missing={r['run'] for r in plan['runs'] if r['condition']==1}
    request['observations']=[o for o in request['observations'] if o['run'] not in missing]
    with pytest.raises(ValueError,match='rango'):analyze(request)
    request=sample()
    for o in request['observations']:o['result']='7'
    with pytest.raises(ValueError,match='constante'):analyze(request)
    for o,p in zip(request['observations'],design(request['design'])['runs']):o['result']=str(10+2*p['codes'][0])
    with pytest.raises(ValueError,match='residual'):analyze(request)

def test_categories_and_deviations():
    request=sample();request['design'].update(factorType1='category',factorLow1='Fibra local',factorHigh1='Fibra tratada')
    request['observations'][0]['actual']=['Otra fibra']
    result,_=analyze(request)
    assert result['equation_real'] is None
    assert any('difiere' in w for w in result['warnings'])
    assert predict(request,['Fibra local',20])['mean']==pytest.approx(8)

def test_api_serialization_figures_and_static_privacy(tmp_path):
    client=TestClient(app);request=sample()
    assert client.get('/api/v1/health').json()['source']=='motor'
    response=client.post('/api/v1/analyze',json=request)
    assert response.status_code==200,response.text
    result=response.json();json.dumps(result,allow_nan=False)
    assert {'pareto','qq','observed','effect_A','interaction_AB'}<=result['charts'].keys()
    assert 'mL' in result['charts']['observed']['layout']['xaxis']['title']['text']
    for fmt,magic in [('png',b'\x89PNG'),('svg',b'<?xml'),('pdf',b'%PDF')]:
        response=client.post(f'/api/v1/figure/observed?format={fmt}&dpi=300',json=request)
        assert response.status_code==200 and response.content.startswith(magic),response.text[:1000]
        (tmp_path/f'observed.{fmt}').write_bytes(response.content)
    assert client.post('/api/v1/figure/observed?dpi=600',json=request).status_code==200
    assert client.post('/api/v1/figure/absent',json=request).status_code==404
    for path in ['/.git/config','/experimental_engine/science.py','/docs/EXPERIMENTAL_PLATFORM.md','/css/../../.git/config']:
        assert client.get(path).status_code==404
    assert client.get('/laboratorio/workspace/').status_code==200
    # Useful as an authentic fixture for UI tests; never served to the product.
    (ROOT/'experimental_engine/tests/calculated-fixture.json').write_text(json.dumps(result,ensure_ascii=False,allow_nan=False),encoding='utf-8')

@pytest.mark.parametrize('mutation',[
    lambda r:r['design'].update(factorCount=5),
    lambda r:r['design'].update(centerPoints=1),
    lambda r:r['design'].update(calculation='invented'),
    lambda r:r['observations'][0].update(result='NaN'),
    lambda r:r['observations'][0].update(actual=None),
    lambda r:r['observations'][0].update(exclusion='yes'),
    lambda r:r['observations'].append(r['observations'][0]),
])
def test_invalid_api_inputs_return_clear_error(mutation):
    request=sample();mutation(request)
    response=TestClient(app).post('/api/v1/analyze',json=request)
    assert response.status_code==422 and response.json()['detail']
