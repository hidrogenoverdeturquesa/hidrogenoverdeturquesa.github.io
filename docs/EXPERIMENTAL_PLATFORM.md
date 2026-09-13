# HVT Experimental Platform — implementación local 1.0

Fecha: 2026-09-13. La implementación se verificó primero en local y el usuario autorizó después publicar el diseñador y el workspace. La web conserva sus URLs. El motor estadístico funciona localmente; su alojamiento público está pendiente. GitHub Pages por sí solo no ejecuta FastAPI.

## Diagnóstico previo a las modificaciones

Se inspeccionó el árbol completo: 471 archivos, incluidos 20 JavaScript, 9 CSS, 5 archivos de laboratorio, documentación, fuentes, imágenes, vídeos y cuadernillos. Era un sitio estático HTML/CSS/JavaScript: sin React, Vite, package.json raíz ni backend científico. No se encontró AGENTS.md ni `.openai/hosting.json`.

El diseñador existente resolvía pregunta, hipótesis, medición, factores numéricos/categóricos, factorial completo de 1–4 factores, réplicas, bloques completos, semilla, protocolo, cuatro tablas y exportaciones. Su borrador local `hvt-doe-guided-v1` conservaba decisiones del formulario, pero no un expediente versionado de mediciones. Se preserva esa implementación.

Se conservan las rutas laboratorio, calculadora-hidrogeno-verde, diseno-experimentos, equipo y fuentes-cientificas. Los estilos y el chatbot flotante del sitio (`mentor.css`, `mentor.js`) no se modifican ni se cargan en el nuevo workspace. La configuración de Supabase existente corresponde a otros flujos: no se presenta como persistencia científica.

Estado Git inicial: PDF de planta de hidrógeno modificado y recursos ajenos `pirolisis-solar.svg` y `solar-termica-anu.webm` sin seguimiento. Quedan fuera de esta intervención.

## Archivos modificados

| Ruta | Función del cambio |
|---|---|
| `laboratorio/diseno-experimentos/index.html` | Acceso a expedientes y botón para transferir el plan vigente al workspace. Conserva el asistente, sus tablas y el ejemplo HVT de cobertura de fibras y pérdida de agua. |
| `js/diseno-experimentos.js` | Expone la lógica existente como `HVTDOE` y una copia del plan vigente. No cambia el algoritmo factorial ni la validación anterior. |

## Archivos creados

| Ruta | Función |
|---|---|
| `laboratorio/workspace/index.html` | Aplicación científica con etapas, panel central, Mentor y estado del motor. |
| `css/experimental-workspace.css` | Estilos locales; reutiliza variables de `laboratorio-paginas.css`, Roboto/Manrope, turquesa `--lab-green-dark`, fondos y bordes HVT. |
| `js/experimental/experiment.js` | Modelo Experiment, versiones, registros originales, decisiones, snapshots de análisis, exportación CSV e importación validada. |
| `js/experimental/storage.js` | Repositorio local por ID, control de revisión, importación/exportación sin sobrescribir un expediente existente. |
| `js/experimental/bridge.js` | Transfiere el plan revisado y las mediciones existentes desde el diseñador. Rechaza planes desactualizados. |
| `js/experimental/mentor.js` | Reglas metodológicas contextuales; interpreta los resultados de Python, sin ajustar modelos ni inventar coeficientes. |
| `js/experimental/workspace.js` | Formularios, etapas, tablas, API, visualización Plotly, predicciones e informe HTML versionado. |
| `experimental_engine/__init__.py` | Paquete Python aislado. |
| `experimental_engine/science.py` | Factorial, OLS, ANOVA, efectos, ecuaciones, influencia y predicción. |
| `experimental_engine/figures.py` | Figuras Plotly y exportación Matplotlib. |
| `experimental_engine/app.py` | FastAPI y previsualización local del sitio con directorios públicos explícitos. |
| `experimental_engine/requirements.txt` | Dependencias directas fijadas del motor. |
| `experimental_engine/requirements-dev.txt` | Dependencias de prueba. |
| `experimental_engine/.gitignore` | Excluye entornos, cachés, fixtures calculados y evidencias temporales de QA. |
| `experimental_engine/tests/__init__.py` | Paquete de pruebas. |
| `experimental_engine/tests/test_science.py` | Casos conocidos, contraste con statsmodels, API, serialización, figuras y paridad JavaScript/Python. |
| `tools/package.json` | Dependencias exclusivamente de pruebas: jsdom y transporte WebSocket del navegador de QA. No introduce un build para la web. |
| `tools/.gitignore` | Excluye dependencias locales de pruebas. |
| `tools/public-design.test.cjs` | Regresión matemática del diseñador público. |
| `tools/public-wizard.test.cjs` | Regresión del flujo público, tablas y campos. |
| `tools/workspace.test.cjs` | Persistencia, versiones, formularios, trazabilidad, API y estados desconectados. |
| `tools/visual-check.cjs` | Recorrido real mediante Chrome sin ventana, perfil temporal vacío y motor local; captura pantallas y verifica anchos y paneles. |
| `docs/EXPERIMENTAL_PLATFORM.md` | Arquitectura, límites, ejecución, evidencia y siguientes pasos. |

Los scripts transitorios de preparación no forman parte del sitio. No se modifican estilos globales ni las otras calculadoras.

## Arquitectura

```text
Diseñador público existente ── HVTDOE / bridge ── Workspace
                                                 │
                      Experiment ←→ Repository localStorage
                                                 │
                                      JSON / API FastAPI
                                                 │
                                   science.py → figures.py
                                                 │
                          resultados estructurados y hash de entrada
                                                 │
                            tablas / Plotly / Mentor contextual
```

JavaScript gestiona interacción, versiones y el plan del diseñador preservado. Python reconstruye el plan mediante la misma semilla antes de analizar: las columnas experimentales nunca se toman de una matriz arbitraria enviada por el navegador. La verificación explícita compara orden, combinación, réplica, bloque y niveles. No hay un segundo motor estadístico en modo guiado/avanzado.

Mentor ocupa 23 % del ancho de escritorio, con mínimo de 230 px, y puede contraerse. La navegación ocupa 168 px. Hasta 1050 px Mentor se abre bajo el contenido; hasta 700 px las etapas también se abren por botón. Las tablas tienen desplazamiento interno. Los controles tienen etiquetas, foco visible y estados textuales; los cambios de etapa advierten sobre entradas sin guardar.

Las recomendaciones muestran origen Mentor. Datos y decisiones muestran investigador; OLS, tablas, gráficos y predicciones muestran motor. El plan inicial identifica su origen JavaScript y cambia a verificado cuando se contrasta con Python.

### API v1

| Método / ruta | Entrada / salida |
|---|---|
| `GET /api/v1/health` | Versión, capacidades implementadas y familias pendientes. |
| `POST /api/v1/design` | Decisiones del diseñador → matriz estándar, corridas aleatorias, términos y parámetros. |
| `POST /api/v1/analyze` | `{design, observations, design_version, dataset_version}` → OLS, ANOVA, diagnósticos, ecuaciones, figuras y procedencia. |
| `POST /api/v1/predict` | `{analysis: <entrada de análisis>, values: [...], block: null|n}` → media, IC e intervalo individual. |
| `POST /api/v1/figure/{id}?format=png&dpi=300` | Entrada de análisis conservada → figura estática; PNG/SVG/PDF, 300/600 dpi. |
| `GET /api/v1/plotly.js` | Biblioteca servida por el motor instalado; no depende de CDN. |

Errores metodológicos devuelven 422 con explicación. Tamaño de petición: 2 MB. Origen único por defecto; `HVT_ALLOWED_ORIGINS` habilita orígenes concretos separados por comas cuando se configure otra instalación. La API es **sin estado**: no guarda datos experimentales en servidor. La previsualización sirve exclusivamente laboratorio/css/js/fonts/images; no expone `.git`, código Python, archivos de datos privados ni documentación del servidor.

## Funcionalidad científica operativa

* Factorial completo **2ᵏ**: dos niveles por factor; **k = 1…4**, réplicas independientes **r = 2…10**, **N = 2ᵏ × r**, entre 4 y 160 corridas. Se conserva el mínimo de dos réplicas del diseñador. No hay puntos centrales.
* Aleatorización reproducible Mulberry32/Fisher–Yates. Orden completo o aleatorio dentro de bloques completos por réplica. Misma matriz que el diseñador con semillas 1, 43 y 999999, para todos los k admitidos.
* Modelo con intercepto y **todas** las interacciones hasta orden k. Variables numéricas codificadas `(z − centro)/semirrango`; categorías −1/+1. No se realiza selección automática de términos.
* Bloques como efectos fijos aditivos con contrastes de suma cero. Los primeros b−1 coeficientes representan bloques respecto a la media general; el último es la suma negativa. No se estima tratamiento × bloque ni un efecto aleatorio.
* OLS clásico: β, error estándar, t, p e IC 95 %. Efecto factorial = 2β. Ecuación codificada y expansión SymPy en unidades reales cuando todos los factores son numéricos. Las unidades de cada variable quedan visibles; las categorías no se transforman en una falsa variable continua.
* ANOVA tipo III: diferencia de SSE al retirar cada término del modelo completo; bloques evaluados conjuntamente. Se muestran SC, GL, CM, F y p. Con datos desbalanceados las SC parciales pueden no sumar al total. El F global incluye bloques cuando están presentes.
* R², R² ajustado, RMSE, GL, número de parámetros y condición numérica. No se ofrece inferencia cuando faltan GL residuales, el modelo pierde rango, la respuesta es constante o la varianza residual es numéricamente nula.
* Se utilizan niveles **asignados** por el diseño. Condiciones reales diferentes quedan registradas y generan advertencias; no se sustituyen silenciosamente en el modelo.
* Se seleccionan registros realizados, con respuesta y sin exclusión documentada. Datos vacíos no equivalen a cero. Las restas de lecturas se calculan en Python con unidades idénticas. No se hace imputación ni conversión de unidades.
* Diagnóstico: observado/ajustado, residuos/ajustados, Q-Q normal, residuos/orden, leverage y Cook. Cook > 4/n es una señal para revisar, nunca una eliminación automática. Si faltan órdenes reales se etiqueta expresamente el eje como orden planificado.
* Gráficos Python: efectos principales, interacciones por pares, Pareto |t|, residuos, observado/ajustado e influencia. Efectos e interacciones se promedian equilibradamente sobre los otros factores y sobre efectos aditivos de bloque. El Pareto utiliza α individual = 0,05; no hay ajuste por múltiples comparaciones.
* Predicción dentro del dominio, con IC de media e intervalo para una observación al 95 %. Requiere bloque observado si corresponde. Interpolar no prueba ausencia de curvatura; una predicción no es validación experimental.

Se requiere juicio del investigador sobre independencia, normalidad de errores, homocedasticidad y relevancia práctica. El nombre de responsable y los estados aprobado/cerrado son declaraciones locales, no una certificación ni un flujo de autorización autenticado.

## Datos y versiones

Cada expediente tiene ID `EXP-HVT-fecha-identificador`, metadatos, historial, diseños/protocolos, matriz, revisiones originales, decisiones de exclusión, bitácora/equipos/condiciones, análisis, predicciones e informes. Las colecciones de evidencias y referencias son puntos de extensión; **no hay carga de archivos ni gestor bibliográfico implementado**. La referencia del protocolo sí se puede documentar.

* Cambiar factores, respuesta, réplica, semilla o protocolo crea otra versión del diseño. Sus corridas empiezan vacías; las mediciones anteriores siguen vinculadas a su diseño original. El histórico completo se exporta a JSON.
* Corregir una medición añade un registro con actor, razón, fecha y diseño. El dataset vigente selecciona la última revisión sin eliminar la original.
* Una exclusión es otra decisión con razón, actor y fecha. El snapshot de cada análisis incluye sus exclusiones, vinculándolas a esa versión de análisis.
* Cada cálculo guarda su entrada exacta, resultado, motor, versiones numéricas, fecha y SHA-256 de entrada. Una modificación posterior señala el análisis como histórico e impide predecir con él hasta recalcular. Se rechaza también un cálculo que llegue después de cambiar de expediente.
* Las predicciones se conservan con entrada y versión de análisis. Los informes guardan una instantánea de metadatos, diseño, dataset, análisis e historial. El HTML exporta la última versión guardada, conservando su contexto aunque el expediente cambie después. El JSON conserva todas las versiones.
* CSV del workspace: datos vigentes, orden previsto/real, niveles previstos/reales, lecturas, respuesta, procedencia y decisión de exclusión con responsable/fecha/razón. Para respuestas derivadas solo exporta valores calculados por un análisis vigente; si no existen quedan pendientes, sin inventar cero. CSV no reemplaza el expediente JSON.

Se evita la sobrescritura de revisiones concurrentes mediante comprobación de revisión antes de guardar. No es una transacción distribuida ni elimina por completo una carrera simultánea entre pestañas. Se informa de cambios desde otra pestaña; importaciones con ID existente no sobrescriben. Ante cuota o bloqueo de almacenamiento se mantiene una copia pendiente exportable. Límite de importación 20 MB, sujeto a la cuota inferior del navegador. El historial local puede alterarse fuera de la aplicación: **no es una auditoría inviolable**. Las importaciones no certifican autoría ni autenticidad de un cálculo; para verificarlas se debe recalcular con Python.

### Persistencia real propuesta, aún no implementada

PostgreSQL con `experiments` (tenant/propietario/revisión), `experiment_metadata_versions`, `design_versions`, `protocol_versions`, `planned_runs`, `measurement_revisions`, `selection_decisions`, `dataset_snapshots`, `analyses`, `models`, `predictions`, `report_versions`, `audit_events`, `references` y `file_assets`. Claves de diseño y corrida, referencias de versión y hash de entrada explícitas; mediciones y decisiones se insertan, no se actualizan ni se borran.

El servidor autenticado debe asignar actor/fecha, comprobar autorización por proyecto, efectuar escritura y auditoría en una transacción con versión esperada/ETag, y validar un snapshot antes de crear un trabajo de cálculo. Los binarios requieren almacenamiento de objetos con checksum y manifiesto; figuras deben referenciar análisis y versión del motor. Retención, restauración y migración del JSON local requieren política y pruebas. No se han creado tablas falsas, cuentas, endpoints de almacenamiento vacíos ni conexiones Supabase nominales.

## Preparado, sin implementar

Optimizar y Validar aparecen deshabilitados como Próximamente. No están operativas RSM, superficies/contornos, puntos centrales, potencia, falta de ajuste por curvatura, optimización, deseabilidad, campañas de confirmación, factoriales fraccionados, Plackett–Burman, Definitive Screening, CCD, Box–Behnken, mezclas, Taguchi, D-optimal, custom designs, split-plot o factores difíciles de cambiar. Nuevas familias deben implementar generación, validación, términos, análisis, predicción y pruebas específicas antes de anunciar una capacidad en `/health`.

El informe HTML incluye tablas y procedencia; las figuras se exportan por separado y sus especificaciones Plotly permanecen en el JSON. No hay editor PDF de informes, firma digital, adjuntos, colaboración multiusuario ni selector visual de todos los análisis históricos. Se puede recuperar el historial completo mediante JSON.

## Ejecución local reproducible

Python 3.11 y Node 24 fueron los entornos de prueba. Desde la raíz del repositorio, PowerShell:

```powershell
py -3.11 -m venv experimental_engine/.venv
experimental_engine/.venv/Scripts/python.exe -m pip install -r experimental_engine/requirements-dev.txt
experimental_engine/.venv/Scripts/python.exe -m uvicorn experimental_engine.app:app --host 127.0.0.1 --port 8767
```

Abrir `http://127.0.0.1:8767/laboratorio/diseno-experimentos/`, completar/generar el plan y pulsar **Crear expediente y continuar en el workspace**. Volver a expedientes desde `http://127.0.0.1:8767/laboratorio/workspace/`. Los datos son por origen de navegador: localhost, 127.0.0.1, otro puerto y el dominio público tienen almacenes diferentes. Para trasladarlos, exportar/importar JSON.

En alojamiento estático se conserva diseño y registro local; el análisis permanece deshabilitado hasta configurar un servicio compatible. Para una instalación separada hace falta HTTPS, CORS específico y despliegue real del motor. Este servicio se entrega para localhost; antes de exponerlo en Internet faltan autenticación, aislamiento, límites de trabajos y controles operativos.

Pruebas desde la raíz:

```powershell
experimental_engine/.venv/Scripts/python.exe -m pytest experimental_engine/tests -q -o cache_dir=experimental_engine/.pytest_cache
npm.cmd install --prefix tools --ignore-scripts --no-audit --no-fund
node --test tools/*.test.cjs
node tools/visual-check.cjs
```

Ejecutar Python antes de las pruebas DOM: genera `experimental_engine/tests/calculated-fixture.json` con resultados reales del motor para la prueba aislada de presentación. El producto no carga ese fixture. QA visual necesita el servicio local en 8767 y Chrome instalado; usa un perfil nuevo y datos sintéticos rotulados exclusivamente dentro de dicho perfil. Se puede configurar `HVT_CHROME`. Las capturas y `result.json` se guardan en `experimental_engine/qa-output/` y no se versionan.

## Pruebas y comprobaciones

Resultado de esta iteración: **31 pruebas Python aprobadas y 30 pruebas JavaScript aprobadas**, sin fallos. También se completó el recorrido real de navegador/API descrito abajo; no se reemplazó el motor por datos de demostración en ese recorrido.

Se comparan β = (10, 2, −3, 1,5), SSE = 8, GL de error = 8, SC = (48, 108, 27), R² = 183/191 y RMSE = 1 en un factorial 2² con tres réplicas y ruido conocido. Se contrasta además con la API de fórmulas de statsmodels y su ANOVA tipo III, con/sin bloques y con datos desbalanceados. Se prueban los otros k admitidos, rango, constantes, datos derivados, exclusiones, categorías, intervalos y serialización JSON sin NaN.

La regresión JavaScript cubre el diseñador anterior y el workspace: conservación de originales, matrices importadas, revisiones, conflictos, registros, exclusiones, recarga, informes inmutables, predicciones guardadas y modo desconectado sin estadísticas ficticias. Las pruebas DOM comprueban etiquetas reales y tablas semánticas; no sustituyen una auditoría completa con lector de pantalla.

QA real conecta diseñador → expediente → verificación Python → mediciones sintéticas → OLS → Plotly → predicción. Se comprueban anchos 1440, 1280, 1024, 768, 390 y 360 px, ausencia de desbordamiento del documento y paneles móviles contraíbles. Se inspeccionan capturas de escritorio/móvil y una figura. El navegador integrado no pudo iniciar por un error del entorno; se utilizó Chrome local sin ventana y con perfil temporal, sin sesiones del usuario.

El control Git final debe mostrar solamente los dos archivos existentes modificados y los archivos nuevos enumerados arriba, además del trabajo ajeno previamente identificado. Los CSS globales quedan idénticos. La publicación del frontend no activa por sí sola el motor Python.

## Deuda técnica y siguiente fase (máximo cinco acciones)

1. Persistencia PostgreSQL/objetos con usuarios, permisos por proyecto, escritura transaccional, copias/restauración y migración del expediente local.
2. Validación con un experimento HVT real: independencia de réplicas, protocolo, instrumentos, incidencias y relevancia práctica; revisión estadística del análisis.
3. Preparar el servicio para despliegue controlado: entorno bloqueado completo, autenticación, trabajos limitados, observabilidad y pruebas de recuperación.
4. Ampliar revisión accesible con teclado/lector de pantalla y consulta visual de versiones históricas; incorporar adjuntos y figuras a informes reproducibles.
5. Incorporar puntos centrales y campañas de confirmación con pruebas matemáticas antes de RSM/optimización; mantener las demás familias fuera del catálogo operativo.

## Referentes conceptuales consultados

Se estudiaron principios de flujo y rigor, sin copiar interfaces ni código: [JMP: DOE workflow](https://www.jmp.com/en/statistics-knowledge-portal/design-of-experiments/design-of-experiments-workflow), [Minitab: gráficos factoriales](https://support.minitab.com/en-us/minitab/help-and-how-to/statistical-modeling/doe/how-to/factorial/analyze-factorial-design/perform-the-analysis/select-the-graphs-to-display/), [Design-Expert: optimización numérica](https://www.statease.com/docs/latest/navigation/numerical-optimization/), [modeFRONTIER](https://engineering.esteco.com/modefrontier/), [optiSLang](https://ansyshelp.ansys.com/public/Views/Secured/corp/v251/en/opti_tut/opti_tut.html). Referencias técnicas: [NIST: factoriales de dos niveles](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3331.htm), [statsmodels: ANOVA](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html), [statsmodels: influencia OLS](https://www.statsmodels.org/stable/generated/statsmodels.stats.outliers_influence.OLSInfluence.html), [FastAPI: CORS](https://fastapi.tiangolo.com/tutorial/cors/).
