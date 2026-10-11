"""Build the public municipal layer from downloaded official sources (read-only).

Usage: python tools/build_boyaca_organics.py --sources E:/Empresa\ HTV/.observatorio-work/sources
Input filenames and source URLs are recorded in data/observatorio/fuentes.json.
No population multipliers, organic-fraction assumptions or energy yields are used.
"""
from pathlib import Path
import argparse, hashlib, json, re, unicodedata, zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'data/observatorio'
SOURCES = {
 'dane': {'title':'DANE · Marco Geoestadístico Nacional, servicio MGN2025', 'url':'https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/317', 'file':'boyaca.geojson', 'note':'Polígonos simplificados a 0,001 grados; MPIO_NANO se conserva por municipio. Límites geoestadísticos, no deslinde legal.'},
 'locations': {'title':'Datos Abiertos Colombia · DIVIPOLA, códigos y coordenadas', 'url':'https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w', 'file':'municipios.json', 'note':'Puntos de referencia municipal; no representan instalaciones de tratamiento.'},
 'pgirs': {'title':'Corpoboyacá · Cuadro de comando y control 2025', 'url':'https://www.corpoboyaca.gov.co/vigente/seguimiento-a-los-pgirs/attachment/cuadro-comando-y-control-2025/', 'file':'pgirs.xlsx', 'note':'87 municipios de la jurisdicción. Hoja1, columna BC: promedio de generación total (t/año). No desagrega orgánicos ni precisa el período de cada promedio. El rótulo 2025 es de la publicación, no un año común de medición.'},
 'pacas': {'title':'Corpoboyacá · Programa de minimización de orgánicos y separación, 2025', 'url':'https://www.corpoboyaca.gov.co/cms/wp-content/uploads/2026/03/Informe-pacas-y-codigo-de-colores-2025.pdf', 'file':'pacas.pdf', 'note':'Sección 6.1: talleres y construcción de pacas. Evidencia de actividad; no cuantifica generación municipal ni toneladas tratadas.'},
 'tunja': {'title':'Alcaldía de Tunja · Informe PGIRS 2024, tabla 1, página 23', 'url':'https://alcaldiatunja.micolombiadigital.gov.co/sites/alcaldiatunja/content/files/001978/98859_inf_pgirs_2024.pdf', 'file':'tunja.pdf', 'note':'Caracterización URBASER 2022–2024: fracción orgánica reportada; no es una medición satelital.'},
 'paipa': {'title':'Alcaldía de Paipa · Actualización PGIRS 2024, tabla 7, página 47', 'url':'https://www.paipa-boyaca.gov.co/Transparencia/PlaneacionGestionyControl/ACTUALIZACI%C3%93N%20PLAN%20DE%20GESTI%C3%93N%20INTEGRAL%20DE%20RESIDUOS%20S%C3%93LIDOS%20PGIRS%20%202024.pdf', 'file':'paipa.pdf', 'note':'33,8 % de orgánicos en disposición final; no se extrapola a toda la generación. La tabla 6 reporta 218 t/mes de orgánicos, pero sus componentes no concilian con el total de 536,3 t/mes: se excluye esa cantidad de los indicadores hasta contrastarla.'}
}
def norm(s):
    return re.sub(r'[^A-Z0-9]', '',unicodedata.normalize('NFKD',s.upper()).encode('ascii','ignore').decode())
def number(value):
    try:
        v=float(value)
        return round(v,4) if 0 <= v < 1e8 else None
    except (TypeError,ValueError): return None
def run(folder):
    OUT.mkdir(parents=True,exist_ok=True)
    geo=json.loads((folder/'boyaca.geojson').read_text(encoding='utf-8'))
    locations={m['cod_mpio']:m for m in json.loads((folder/'municipios.json').read_text(encoding='utf-8')) if m['cod_dpto']=='15'}
    records={}
    for f in geo['features']:
        p=f['properties']; code=p['MPIO_CDPMP']; loc=locations[code]
        assert f['geometry'] and code.startswith('15')
        records[code]={'code':code,'name':p['MPIO_CNMBRE'].title(),'latitude':float(loc['latitud'].replace(',','.')),'longitude':float(loc['longitud'].replace(',','.')),'geometryYear':p['MPIO_NANO'],'organic':None,'activities':[],'context':None}
        f['properties']={'code':code,'name':records[code]['name'],'geometryYear':p['MPIO_NANO']}
        f.pop('id',None)
    assert len(records)==123
    byname={norm(r['name']):code for code,r in records.items()}
    for alias,official in [('VILLADELEYVA','VILLADELEIVA'),('GUICAN','GUICANDELASIERRA'),('SANTAROSAVITERBO','SANTAROSADEVITERBO')]:
        if official in byname: byname[alias]=byname[official]
    with zipfile.ZipFile(folder/'pgirs.xlsx') as z:
        ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        strings=[''.join(s.itertext()) for s in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        matched=[]
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:row',ns):
            values={}
            for c in row.findall('s:c',ns):
                v=c.find('s:v',ns)
                if v is not None: values[re.sub(r'\d','',c.attrib['r'])]=strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
            if 'C' not in values or values['C']=='MUNICIPIO': continue
            name=norm(values['C']); assert name in byname,values['C']
            code=byname[name]; assert code not in matched; matched.append(code)
            records[code]['context']={'source':'pgirs','cell':'Hoja1!BC'+row.attrib['r'],'totalGenerationTonYear':number(values.get('BC')),'rawTotal':values.get('BC'),'period':None,'physicalCharacterizationReference':values.get('AN'),'note':'Residuos sólidos totales, no orgánicos. Período del promedio no desagregado en la matriz.'}
        assert len(matched)==87
    # Page-specific evidence: only completed workshop entries in section 6.1.
    pages=(folder/'pacas.txt').read_text(encoding='utf-8').split('\f')
    for i,page in enumerate(pages):
        for m in re.finditer(r'(?m)^Municipio:\s*([^\n]+)\nTaller social[^\n]*\nFecha taller:\s*([^\n]+)',page):
            name=norm(m[1]); assert name in byname,m[1]
            records[byname[name]]['activities'].append({'source':'pacas','year':2025,'dateLabel':m[2].strip(),'page':i+1,'label':'Taller y construcción de paca digestora','quantityTon':None})
    records['15001']['organic']={'value':39,'unit':'%','year':2024,'source':'tunja','page':23,'table':'Tabla 1','scope':'Caracterización de residuos sólidos reportada por URBASER Tunja. El informe no precisa aquí si el muestreo fue en fuente o disposición final.','series':[{'year':2022,'value':33.06},{'year':2023,'value':39.2},{'year':2024,'value':39}],'qualityNote':'Proporción reportada de una caracterización; no cuantifica toneladas disponibles.'}
    records['15516']['organic']={'value':33.8,'unit':'%','year':2024,'source':'paipa','page':47,'table':'Tabla 7','scope':'Caracterización en sitio de disposición final, componente urbano. Año de la actualización del PGIRS; fecha exacta del muestreo no indicada en la tabla.','series':[],'qualityNote':'No comparable directamente con una caracterización en fuente. Se excluye el tonelaje de la tabla 6 por inconsistencia de sus totales.'}
    for r in records.values():
        r['status']='characterization' if r['organic'] else 'activity' if r['activities'] else 'context' if r['context'] else 'missing'
    result={'schemaVersion':1,'updatedAt':'2026-09-28','scope':'Boyacá, Colombia','method':'Inventario documental municipal. No representa medición satelital de residuos ni potencial energético calculado. Sin dato no significa cero.','municipalities':sorted(records.values(),key=lambda x:x['name'])}
    for s in SOURCES.values(): s['sha256']=hashlib.sha256((folder/s['file']).read_bytes()).hexdigest()
    manifest={'retrievedAt':'2026-09-28','sources':SOURCES,'excluded':[{'source':'paipa','page':47,'reason':'Tabla 6: suma de componentes 652 t/mes frente a total publicado 536,3 t/mes; no se usa el valor 218 t/mes para cálculos.'}],'coverage':{'municipalities':123,'contextPGIRS':87,'organicCharacterizations':2,'workshopMunicipalities':sum(bool(r['activities']) for r in records.values())}}
    for name,data in [('boyaca-municipios.geojson',geo),('boyaca-organicos.json',result),('fuentes.json',manifest)]:
        (OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps(manifest['coverage']))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,required=True);run(p.parse_args().sources)
