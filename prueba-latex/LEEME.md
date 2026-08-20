# Prueba temporal de cuadernillo en LaTeX

Esta carpeta no modifica los cuadernillos publicados.

1. Abre `cuadernillo-prueba.tex` en TeXstudio.
2. Cambia un título, una frase o un elemento de una lista y guarda.
3. Haz doble clic en `generar-prueba.cmd`.
4. Revisa `cuadernillo-prueba-web.pdf` y `../prueba-cuadernillo-latex.html`.

El PDF se imprime desde la página HTML generada. De esta forma utiliza el mismo
CSS y no una segunda imitación del diseño construida independientemente en LaTeX.

También puedes ejecutar el generador desde PowerShell (sin cambiar permanentemente
la política de seguridad de Windows):

```powershell
powershell -ExecutionPolicy Bypass -File .\generar-prueba.ps1
```

Cuando terminemos la evaluación se pueden eliminar esta carpeta y el archivo
`prueba-cuadernillo-latex.html` sin afectar el resto del sitio.
