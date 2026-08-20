@echo off
setlocal
cd /d "%~dp0"

if not exist "build" mkdir "build"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\planta-hidrogeno" mkdir "..\temporales\planta-hidrogeno"

node "build\flatten-latex.js" "planta-hidrogeno.tex" "build\planta-hidrogeno-flat.tex" || goto :error
pdflatex -interaction=nonstopmode -halt-on-error -jobname=planta-hidrogeno -aux-directory="..\temporales\planta-hidrogeno" -output-directory="..\salidas" "build\planta-hidrogeno-flat.tex" || goto :error
node "..\plantilla\generar-html.js" "%CD%\build\planta-hidrogeno-flat.tex" "%CD%\..\..\proyecto-planta-hidrogeno-latex.html" || goto :error

echo Generacion terminada. PDF: ..\salidas\planta-hidrogeno.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
