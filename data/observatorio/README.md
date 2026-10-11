# Residuos orgánicos de Boyacá: piloto documental

Revisión de fuentes: 28 de septiembre de 2026. No es una medición satelital ni una estimación de potencial energético. Cubre residuos sólidos municipales; no inventaría subproductos agrícolas, pecuarios o industriales.

- `boyaca-municipios.geojson`: 123 polígonos DANE, simplificados a 0,001 grados. Unión por código DIVIPOLA de cinco cifras. `geometryYear` conserva MPIO_NANO del servicio, aunque su nombre incluya MGN2025. Límites geoestadísticos, no deslindes legales.
- `boyaca-organicos.json`: caracterizaciones orgánicas en dos municipios, actividades documentadas en 20 y contexto PGIRS en 87. Las coberturas se superponen. `null` significa dato no integrado, nunca cero.
- `fuentes.json`: URL oficial, archivo de origen, SHA-256, alcance y exclusiones. Los PDF/XLSX originales no se redistribuyen aquí.

Los colores priorizan caracterización, actividad, contexto y ausencia de dato, en ese orden. No ordenan municipios por generación ni calidad ambiental. Los porcentajes de Tunja y Paipa tienen alcances distintos y no se promedian. Los talleres no cuantifican toneladas. La columna BC de la matriz PGIRS informa residuos totales y no identifica un período común por registro. No se multiplica por fracciones orgánicas de otra fuente.

Se excluye el tonelaje de la tabla 6 de Paipa: sus componentes suman 652 t/mes, frente al total publicado de 536,3 t/mes. El 33,8 % se transcribe separadamente de la tabla 7, componente urbano en disposición final (p. 47).

## Reproducción

Descargar los archivos oficiales con los nombres de `fuentes.json` en una carpeta de trabajo, conservar los originales y extraer `pacas.txt` con `pdftotext -layout -enc UTF-8 pacas.pdf pacas.txt`. Para DANE, consultar el servicio del catálogo con `where=DPTO_CCDGO='15'`, `outFields=*`, `returnGeometry=true`, `outSR=4326`, `maxAllowableOffset=0.001`, `geometryPrecision=4`, `f=geojson`. Los puntos DIVIPOLA proceden de `https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000`.

Ejecutar desde el repositorio:

```text
python tools/build_boyaca_organics.py --sources "RUTA_A_LAS_FUENTES"
```

El constructor solo lee las fuentes; no altera los libros originales. Las dos caracterizaciones se transcribieron y comprobaron en sus páginas PDF. Antes de actualizar archivos fuente, revisar esas transcripciones, fechas, alcances y exclusiones; actualizar el corte documental y ejecutar las pruebas `tools/observatorio-organicos.test.cjs`.
