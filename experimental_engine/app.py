"""Local scientific API. Stateless computations; no implied cloud persistence."""
from pathlib import Path
import json
import os
import threading
from typing import Any, Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from plotly.offline import get_plotlyjs
from .science import ENGINE, analyze, design, predict, json_safe
from .figures import charts, static_figure

class AnalysisRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    design: dict[str,Any]
    observations: list[dict[str,Any]]=Field(default_factory=list,max_length=160)
    design_version: int=Field(default=1,ge=1)
    dataset_version: int=Field(default=0,ge=0)

class PredictionRequest(BaseModel):
    analysis: AnalysisRequest
    values: list[Any]=Field(min_length=1,max_length=4)
    block: int|None=None

app=FastAPI(title='HVT Scientific Engine',version='1.0.0')
origins=[v.strip() for v in os.environ.get('HVT_ALLOWED_ORIGINS','').split(',') if v.strip()]
if origins:
    app.add_middleware(CORSMiddleware,allow_origins=origins,allow_methods=['GET','POST'],allow_headers=['Content-Type'])

@app.middleware('http')
async def limit_body(request:Request,call_next):
    if request.method=='POST' and len(await request.body())>2_000_000:
        return JSONResponse({'detail':'La solicitud supera 2 MB.'},status_code=413)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Cache-Control']='no-store'
    return response

@app.exception_handler(ValueError)
async def bad_science(request,exc):
    return JSONResponse({'detail':str(exc)},status_code=422)

@app.get('/api/v1/health')
def health():
    return dict(engine=ENGINE,persistence='browser-local',source='motor',capabilities=['factorial_2k','ols','anova_type_iii','diagnostics','prediction','figures'],unavailable=['center_points','rsm','optimization','cloud_audit'])

@app.post('/api/v1/design')
def make_design(payload:dict[str,Any]):
    return design(payload)

@app.post('/api/v1/analyze')
def analysis(payload:AnalysisRequest):
    request=payload.model_dump()
    result,context=analyze(request)
    result['charts']=charts(result,context,request['design'])
    return json_safe(result)

@app.post('/api/v1/predict')
def prediction(payload:PredictionRequest):
    return json_safe(predict(payload.analysis.model_dump(),payload.values,payload.block))

figure_lock=threading.Lock()

@app.post('/api/v1/figure/{chart_id}')
def figure(chart_id:str,payload:AnalysisRequest,format:Literal['png','svg','pdf']='png',dpi:int=300):
    if dpi not in (300,600):raise HTTPException(422,'Resolución admitida: 300 o 600 dpi.')
    request=payload.model_dump()
    result,context=analyze(request)
    collection=charts(result,context,request['design'])
    if chart_id not in collection:
        raise HTTPException(404,'Figura no disponible para este modelo.')
    with figure_lock:
        content=static_figure(collection[chart_id],format,dpi)
    return Response(content,media_type={'png':'image/png','svg':'image/svg+xml','pdf':'application/pdf'}[format],headers={'Content-Disposition':f'attachment; filename="hvt-{chart_id}.{format}"'})

@app.get('/api/v1/plotly.js')
def plotly_bundle():
    return Response(get_plotlyjs(),media_type='application/javascript')

# Serve only explicit public directories for a same-origin local preview. Never
# mount the repository root: .git, private data, server source and docs stay private.
site_root=Path(os.environ.get('HVT_SITE_ROOT',Path(__file__).resolve().parents[1])).resolve()
base_root=Path(os.environ.get('HVT_BASE_SITE_ROOT',site_root)).resolve()

@app.get('/')
def index():
    return FileResponse(site_root/'laboratorio/workspace/index.html')

@app.get('/{asset_path:path}')
def public_asset(asset_path:str):
    parts=Path(asset_path).parts
    if not parts or parts[0] not in ('laboratorio','css','js','fonts','images') or any(p.startswith('.') for p in parts):
        raise HTTPException(404,'Recurso no disponible.')
    for root in (site_root,base_root):
        target=(root/asset_path).resolve()
        if not target.is_relative_to(root):
            raise HTTPException(404,'Recurso no disponible.')
        if target.is_dir():target=target/'index.html'
        if target.is_file():return FileResponse(target)
    raise HTTPException(404,'Recurso no disponible.')
