"""Full two-level factorial design and OLS with fixed, additive complete blocks.

ANOVA uses partial (type III) sums of squares: drop each term from the full
model. All factorial terms are included; no automatic model or outlier selection.
"""
from itertools import combinations
from datetime import datetime, timezone
import hashlib
import json
import math
import re
import platform
import numpy as np
import scipy
from scipy import stats
import statsmodels
import statsmodels.api as sm
import sympy as sp

ENGINE = 'hvt-factorial-python-1.0.0'


def number(value):
    if isinstance(value, bool) or value is None:
        raise ValueError('Falta un valor numérico válido.')
    text = str(value).strip().replace(',', '.')
    if not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?', text):
        raise ValueError('Número inválido; no use separadores de miles ni unidades en la celda.')
    result = float(text)
    if not math.isfinite(result) or abs(result) > 1e100:
        raise ValueError('Valor fuera del rango numérico admitido.')
    return result


def integer(value, low, high):
    n = number(value)
    if not n.is_integer() or not low <= n <= high:
        raise ValueError(f'Se requiere un entero entre {low} y {high}.')
    return int(n)


def design(data):
    k = integer(data.get('factorCount'), 1, 4)
    r = integer(data.get('repetitions'), 2, 10)
    seed = integer(data.get('seed'), 1, 999999)
    blocking = data.get('blocking', 'none')
    if blocking not in ('none', 'replicate'):
        raise ValueError('Solo se admiten aleatorización completa o bloques completos por réplica.')
    if data.get('centerPoints', 0) not in (0, '0', None):
        raise ValueError('Los puntos centrales aún no están implementados.')
    if data.get('calculation', 'manual') not in ('manual', 'difference'):
        raise ValueError('Cálculo de respuesta desconocido.')
    factors = []
    for i in range(1, k + 1):
        name = str(data.get(f'factorName{i}', '')).strip()
        kind = data.get(f'factorType{i}')
        unit = str(data.get(f'factorUnit{i}', '')).strip() if kind == 'numeric' else ''
        if len(unit)>30:
            raise ValueError('La unidad del factor supera 30 caracteres.')
        if not name or len(name) > 80 or name.casefold() in [f['name'].casefold() for f in factors]:
            raise ValueError('Cada factor necesita un nombre único de hasta 80 caracteres.')
        if kind not in ('numeric', 'category'):
            raise ValueError('Tipo de factor desconocido.')
        levels = [data.get(f'factorLow{i}'), data.get(f'factorHigh{i}')]
        if kind == 'numeric':
            levels = [number(v) for v in levels]
            if levels[0] >= levels[1] or not unit:
                raise ValueError('Los niveles numéricos deben ser distintos, ordenados y tener unidad.')
        else:
            levels = [str(v or '').strip() for v in levels]
            if not all(levels) or any(len(v) > 80 for v in levels) or levels[0].casefold() == levels[1].casefold():
                raise ValueError('Cada factor categórico necesita dos opciones diferentes.')
        factors.append(dict(code=chr(64+i), name=name, type=kind, levels=levels, unit=unit))
    state = seed

    def rand():
        # Exact Mulberry32 / Fisher-Yates parity with the preserved HVT designer.
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xffffffff
        t = ((state ^ (state >> 15)) * (state | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296

    def shuffle(rows):
        for i in range(len(rows)-1, 0, -1):
            j = int(rand() * (i+1))
            rows[i], rows[j] = rows[j], rows[i]
        return rows

    standard = [dict(condition=m+1, codes=[1 if m & (1 << i) else -1 for i in range(k)],
                     values=[f['levels'][(m >> i) & 1] for i, f in enumerate(factors)]) for m in range(2**k)]
    rows = []
    for rep in range(1, r+1):
        group = [dict(row, replica=rep, block=rep if blocking == 'replicate' else None) for row in standard]
        rows.extend(shuffle(group) if blocking == 'replicate' else group)
    if blocking == 'none':
        shuffle(rows)
    rows = [dict(row, run=i+1) for i, row in enumerate(rows)]
    terms = [list(c) for size in range(1, k+1) for c in combinations(range(k), size)]
    return dict(engine=ENGINE, algorithm='Mulberry32/Fisher-Yates', k=k, replicas=r, seed=seed,
                factors=factors, standard=standard, runs=rows, terms=[''.join(factors[i]['code'] for i in t) for t in terms],
                parameters=2**k+(r-1 if blocking == 'replicate' else 0), source='motor')


def response_value(data, observation):
    if data.get('calculation') == 'difference':
        if str(data.get('rawUnit1', '')).strip() != str(data.get('rawUnit2', '')).strip() or str(data.get('rawUnit1', '')).strip() != str(data.get('responseUnit', '')).strip():
            raise ValueError('La resta exige unidades idénticas en ambas lecturas y la respuesta.')
        raw = observation.get('raw', [])
        if not isinstance(raw, list):
            raise ValueError('Las lecturas originales deben ser una lista.')
        if len(raw) < 2 or any(v is None or str(v).strip() == '' for v in raw[:2]):
            return None
        return number(raw[0]) - number(raw[1])
    value = observation.get('result', '')
    return None if value is None or str(value).strip() == '' else number(value)


def fit(request):
    data = request['design']
    plan = design(data)
    observations = request.get('observations', [])
    if len(observations) > len(plan['runs']):
        raise ValueError('Hay más registros que corridas planificadas.')
    by_run = {r['run']: r for r in plan['runs']}
    seen, selected, skipped, warnings = set(), [], [], []
    for o in observations:
        run = integer(o.get('run'), 1, len(plan['runs']))
        if run in seen:
            raise ValueError('No se admite más de un registro vigente por corrida.')
        seen.add(run)
        exclusion = o.get('exclusion')
        if exclusion is not None and (not isinstance(exclusion, dict) or not isinstance(exclusion.get('excluded'), bool)):
            raise ValueError('Decisión de exclusión inválida.')
        if exclusion and exclusion.get('excluded'):
            if not all(str(exclusion.get(key, '')).strip() for key in ('reason', 'actor', 'at')):
                raise ValueError('Una exclusión requiere razón, responsable y fecha.')
            skipped.append(dict(run=run, reason='Exclusión documentada', exclusion=exclusion))
            continue
        if o.get('status', 'pending') != 'done':
            skipped.append(dict(run=run, reason='La corrida no está marcada como realizada.'))
            continue
        y = response_value(data, o)
        if y is None:
            skipped.append(dict(run=run, reason='Respuesta pendiente.'))
            continue
        if not math.isfinite(y):
            raise ValueError('La respuesta derivada no es finita.')
        row = by_run[run]
        actual = o.get('actual', [])
        if not isinstance(actual, list):
            raise ValueError('Las condiciones reales deben ser una lista.')
        for i, f in enumerate(plan['factors']):
            if i < len(actual) and str(actual[i]).strip():
                v = number(actual[i]) if f['type'] == 'numeric' else str(actual[i]).strip()
                if v != row['values'][i]:
                    warnings.append(f'Corrida {run}: {f["name"]} real difiere del plan. El modelo usa niveles asignados; revisar la desviación.')
        selected.append(dict(row, y=y, observed_order=o.get('executionOrder'), date=o.get('date', '')))
    selected.sort(key=lambda row: row['run'])
    missing = sorted(set(by_run)-seen)
    skipped.extend(dict(run=run, reason='Sin registro') for run in missing)
    k = plan['k']
    terms = [list(c) for size in range(1, k+1) for c in combinations(range(k), size)]
    blocks = sorted(set(r['block'] for r in selected if r['block'] is not None))
    names = ['Intercept'] + plan['terms'] + [f'Bloque[{b}]' for b in blocks[:-1]]

    def vector(codes, block=None):
        return [1.] + [float(np.prod([codes[i] for i in term])) for term in terms] + [1. if block == b else -1. if block == blocks[-1] else 0. for b in blocks[:-1]]

    X = np.array([vector(r['codes'], r['block']) for r in selected], dtype=float)
    y = np.array([r['y'] for r in selected], dtype=float)
    if len(selected) <= len(names):
        raise ValueError(f'Datos insuficientes: {len(selected)} respuestas para {len(names)} parámetros. Se necesitan grados de libertad residuales positivos.')
    if np.linalg.matrix_rank(X) < X.shape[1]:
        raise ValueError('El diseño analizable no tiene rango completo. Revise las combinaciones faltantes o excluidas.')
    model = sm.OLS(y, X).fit()
    if model.centered_tss <= np.finfo(float).eps * max(1., float(np.dot(y,y))):
        raise ValueError('Respuesta constante o variación numéricamente indistinguible: R² e inferencia no son interpretables.')
    if model.ssr <= np.finfo(float).eps * max(1., model.centered_tss):
        raise ValueError('No hay variabilidad residual estimable. No se informan pruebas F, p-values o intervalos degenerados.')
    warnings += ['OLS clásico: requiere independencia, varianza aproximadamente constante y normalidad de errores para la inferencia.',
                 'Modelo factorial completo en niveles asignados; no incluye curvatura ni identifica un óptimo interior.',
                 'Contrastes e intervalos al 95 % sin corrección por comparaciones múltiples.']
    if skipped:
        warnings.append('Se analiza un subconjunto de las corridas. Las sumas de cuadrados parciales pueden no ser aditivas.')
    if blocks:
        warnings.append('Bloques fijos aditivos, codificados con suma cero. No se estima interacción tratamiento × bloque.')
    return plan, selected, skipped, names, X, y, model, warnings, vector, blocks


def analyze(request):
    plan, rows, skipped, names, X, y, model, warnings, vector, blocks = fit(request)
    mse = float(model.mse_resid)
    ci = model.conf_int(alpha=.05)
    coefficients = [dict(term=name, estimate=float(model.params[i]), se=float(model.bse[i]),
                         t=float(model.tvalues[i]), p=float(model.pvalues[i]), ci_low=float(ci[i,0]), ci_high=float(ci[i,1]),
                         effect=2*float(model.params[i]) if 0<i<2**plan['k'] else None) for i,name in enumerate(names)]
    anova = []
    groups = [(name,[i]) for i,name in enumerate(names[1:2**plan['k']], 1)]
    if blocks and len(blocks)>1:
        groups.append(('Bloques',list(range(2**plan['k'],len(names)))))
    for name, indices in groups:
        reduced = sm.OLS(y, np.delete(X, indices, axis=1)).fit()
        ss = max(0., float(reduced.ssr-model.ssr))
        df = len(indices)
        f = (ss/df)/mse
        anova.append(dict(term=name, ss=ss, df=df, ms=ss/df, f=f, p=float(stats.f.sf(f,df,model.df_resid))))
    anova.extend([dict(term='Error', ss=float(model.ssr), df=int(model.df_resid), ms=mse, f=None, p=None),
                  dict(term='Total corregido', ss=float(model.centered_tss), df=len(y)-1, ms=None, f=None, p=None)])
    influence = model.get_influence()
    diagnostic = [dict(run=row['run'], order=row['observed_order'], observed=float(y[i]), fitted=float(model.fittedvalues[i]),
                       residual=float(model.resid[i]), leverage=float(influence.hat_matrix_diag[i]),
                       cooks=float(influence.cooks_distance[0][i]), influential=bool(influence.cooks_distance[0][i]>4/len(y))) for i,row in enumerate(rows)]
    coded = 'ŷ = ' + ' '.join(f'{c["estimate"]:+.8g}'+('' if i==0 else '·'+c['term']) for i,c in enumerate(coefficients))
    real = None
    substitutions = []
    if all(f['type']=='numeric' for f in plan['factors']):
        xs = sp.symbols(' '.join('z'+str(i+1) for i in range(plan['k'])), seq=True)
        terms = [list(c) for size in range(1,plan['k']+1) for c in combinations(range(plan['k']),size)]
        expr = sp.Float(model.params[0], 12)
        for j, term in enumerate(terms, 1):
            product = 1
            for i in term:
                lo,hi = plan['factors'][i]['levels']
                product *= (xs[i]-(lo+hi)/2)/((hi-lo)/2)
            expr += sp.Float(model.params[j],12)*product
        real = 'ŷ = '+str(sp.expand(expr))
        if blocks:
            real += ' + efecto de bloque (ver coeficientes de suma cero)'
        substitutions = [dict(variable=str(xs[i]),name=f['name'],unit=f['unit']) for i,f in enumerate(plan['factors'])]
    else:
        warnings.append('Factores categóricos: use la ecuación codificada y el diccionario de niveles; no hay ecuación continua en unidades reales para esos factores.')
    fingerprint = hashlib.sha256(json.dumps(request,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    result = dict(engine=ENGINE, source='motor', calculated_at=datetime.now(timezone.utc).isoformat(), input_sha256=fingerprint,
                  versions=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,statsmodels=statsmodels.__version__),
                  design_version=request.get('design_version'),dataset_version=request.get('dataset_version'),
                  summary=dict(n=len(y),parameters=X.shape[1],df_model=int(model.df_model),df_error=int(model.df_resid),
                               r2=float(model.rsquared),r2_adjusted=float(model.rsquared_adj),rmse=float(np.sqrt(mse)),
                               f=float(model.fvalue),p=float(model.f_pvalue),condition_number=float(model.condition_number)),
                  anova_type='III: SS parciales por término; bloques con contrastes de suma cero',anova=anova,
                  coefficients=coefficients,equation_coded=coded,equation_real=real,real_variables=substitutions,
                  factors=plan['factors'],model_matrix=dict(columns=names,rows=X.tolist(),run_ids=[r['run'] for r in rows]),
                  diagnostics=diagnostic,skipped=skipped,warnings=list(dict.fromkeys(warnings)))
    return result, (plan, rows, model, vector, blocks)


def predict(request, values, block=None):
    plan, rows, skipped, names, X, y, model, warnings, vector, blocks = fit(request)
    if len(values)!=plan['k']:
        raise ValueError('Se requiere un valor por factor.')
    codes=[]
    for f,v in zip(plan['factors'],values):
        if f['type']=='numeric':
            v=number(v);lo,hi=f['levels']
            if not lo<=v<=hi:
                raise ValueError('La predicción debe permanecer dentro del dominio experimental.')
            codes.append((v-(lo+hi)/2)/((hi-lo)/2))
        else:
            if v not in f['levels']:
                raise ValueError('Seleccione un nivel categórico conocido.')
            codes.append(-1 if v==f['levels'][0] else 1)
    if blocks and block not in blocks:
        raise ValueError('Seleccione un bloque observado para predecir.')
    p=model.get_prediction(np.array([vector(codes,block)])).summary_frame(alpha=.05).iloc[0]
    return dict(source='motor',engine=ENGINE,mean=float(p['mean']),mean_ci=[float(p['mean_ci_lower']),float(p['mean_ci_upper'])],
                prediction_interval=[float(p['obs_ci_lower']),float(p['obs_ci_upper'])],confidence=.95,values=values,block=block,
                note='Predicción condicionada al modelo; interpolar no comprueba ausencia de curvatura. No es una corrida de validación.')


def json_safe(value):
    if isinstance(value,dict): return {k:json_safe(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)): return [json_safe(v) for v in value]
    if isinstance(value,(float,np.floating)): return float(value) if math.isfinite(value) else None
    if isinstance(value,np.integer): return int(value)
    return value
