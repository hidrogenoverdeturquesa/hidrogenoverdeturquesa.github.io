"""Scientific charts built in Python, shared by interactive and static outputs."""
import io
import json
from itertools import combinations
import numpy as np
from scipy import stats
import plotly.graph_objects as go
import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt

COLORS=['#007e74','#202728','#5d696a','#00a294']


def charts(result, context, data):
    plan, rows, model, vector, blocks = context
    output={}
    unit=data.get('responseUnit','')
    response=data.get('response','Respuesta')+' ('+unit+')'

    def save(key,title,xlabel,ylabel,traces):
        fig=go.Figure(traces)
        fig.update_layout(title=dict(text=title,font=dict(size=16)),xaxis_title=xlabel,yaxis_title=ylabel,
                          template='plotly_white',font=dict(family='Arial',size=12,color='#202728'),
                          margin=dict(l=70,r=25,t=55,b=65),colorway=COLORS,height=370,
                          legend=dict(orientation='h',y=-.25),paper_bgcolor='#ffffff',plot_bgcolor='#ffffff')
        output[key]=json.loads(fig.to_json())

    observed=[d['observed'] for d in result['diagnostics']]
    fitted=[d['fitted'] for d in result['diagnostics']]
    residual=[d['residual'] for d in result['diagnostics']]
    lo,hi=min(observed+fitted),max(observed+fitted)
    save('observed','Observado vs ajustado', 'Ajustado · '+response,'Observado · '+response,
         [go.Scatter(x=fitted,y=observed,mode='markers',name='Corridas'),go.Scatter(x=[lo,hi],y=[lo,hi],mode='lines',name='Identidad')])
    save('residuals','Residuos vs ajustados','Ajustado · '+response,'Residuo ('+unit+')',
         [go.Scatter(x=fitted,y=residual,mode='markers',name='Residuos'),go.Scatter(x=[min(fitted),max(fitted)],y=[0,0],mode='lines',name='Cero')])
    actual=all(isinstance(d['order'],int) and d['order']>0 for d in result['diagnostics'])
    order=[d['order'] if actual else d['run'] for d in result['diagnostics']]
    save('order','Residuos vs orden de corrida','Orden real registrado' if actual else 'Orden planificado (faltan órdenes reales)','Residuo ('+unit+')',
         [go.Scatter(x=order,y=residual,mode='markers',name='Residuos')])
    (q,r),(slope,intercept,_) = stats.probplot(residual, dist='norm')
    save('qq','Q-Q normal de residuos','Cuantil normal teórico','Residuo ordenado ('+unit+')',
         [go.Scatter(x=q.tolist(),y=r.tolist(),mode='markers',name='Residuos'),go.Scatter(x=q.tolist(),y=(slope*q+intercept).tolist(),mode='lines',name='Referencia normal')])
    save('influence','Influencia por corrida','Orden planificado','Distancia de Cook',
         [go.Scatter(x=[d['run'] for d in result['diagnostics']],y=[d['cooks'] for d in result['diagnostics']],mode='markers',name='Cook'),
          go.Scatter(x=[min(d['run'] for d in result['diagnostics']),max(d['run'] for d in result['diagnostics'])],y=[4/len(rows)]*2,mode='lines',name='Referencia 4/n; revisar, no excluir automáticamente')])
    effects=sorted(result['coefficients'][1:2**plan['k']],key=lambda c:abs(c['t']),reverse=True)
    threshold=float(stats.t.ppf(.975,result['summary']['df_error']))
    save('pareto','Pareto de efectos estandarizados (|t|)','Término factorial','|t| (sin unidad)',
         [go.Bar(x=[c['term'] for c in effects],y=[abs(c['t']) for c in effects],name='|t|'),
          go.Scatter(x=[c['term'] for c in effects],y=[threshold]*len(effects),mode='lines',name='α=0,05 individual; sin ajuste múltiple')])
    corners=plan['standard']
    predictions=[float(model.predict(np.array([vector(r['codes'],None)]))[0]) for r in corners]
    for i,f in enumerate(plan['factors']):
        means=[float(np.mean([y for row,y in zip(corners,predictions) if row['codes'][i]==level])) for level in (-1,1)]
        save('effect_'+f['code'],'Efecto principal · '+f['name'],f['name']+(' ('+f['unit']+')' if f['unit'] else ''),'Media marginal ajustada · '+response,
             [go.Scatter(x=[str(v) for v in f['levels']],y=means,mode='lines+markers',name=f['code']+'; promedio equilibrado de otros factores')])
    for i,j in combinations(range(plan['k']),2):
        a,b=plan['factors'][i],plan['factors'][j]
        traces=[]
        for level,bvalue in zip((-1,1),b['levels']):
            means=[float(np.mean([y for row,y in zip(corners,predictions) if row['codes'][i]==av and row['codes'][j]==level])) for av in (-1,1)]
            traces.append(go.Scatter(x=[str(v) for v in a['levels']],y=means,mode='lines+markers',name=b['name']+' = '+str(bvalue)+' '+b['unit']))
        save('interaction_'+a['code']+b['code'],'Interacción '+a['code']+' × '+b['code'],a['name']+' '+a['unit'],'Media marginal ajustada · '+response,traces)
    return output


def static_figure(chart, fmt='png', dpi=300):
    if fmt not in ('png','svg','pdf') or dpi not in (300,600):
        raise ValueError('Formato o resolución de figura no admitidos.')
    fig,ax=plt.subplots(figsize=(8,5),layout='constrained')
    for i,trace in enumerate(chart['data']):
        x,y=trace.get('x',[]),trace.get('y',[])
        if trace.get('type')=='bar': ax.bar(x,y,label=trace.get('name'),color=COLORS[i%4])
        else:
            mode=trace.get('mode','lines')
            ax.plot(x,y,linestyle='-' if 'lines' in mode else '',marker='o' if 'markers' in mode else '',markersize=4,label=trace.get('name'),color=COLORS[i%4])
    layout=chart['layout']
    ax.set(title=layout['title']['text'],xlabel=layout['xaxis']['title']['text'],ylabel=layout['yaxis']['title']['text'])
    ax.grid(alpha=.2);ax.legend(fontsize=7)
    output=io.BytesIO()
    fig.savefig(output,format=fmt,dpi=dpi)
    plt.close(fig)
    return output.getvalue()
