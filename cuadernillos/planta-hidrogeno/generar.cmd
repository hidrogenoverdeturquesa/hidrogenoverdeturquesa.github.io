@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\planta-hidrogeno" mkdir "..\temporales\planta-hidrogeno"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\planta-hidrogeno" -output-directory="..\salidas" planta-hidrogeno.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\planta-hidrogeno.tex" "%CD%\..\..\proyecto-planta-hidrogeno-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\planta-hidrogeno.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
