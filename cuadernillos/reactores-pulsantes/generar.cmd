@echo off
setlocal
cd /d "%~dp0"
if not exist "..\temporales\reactores-pulsantes" mkdir "..\temporales\reactores-pulsantes"
if not exist "..\salidas" mkdir "..\salidas"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\reactores-pulsantes" -output-directory="..\salidas" reactores-pulsantes.tex || exit /b 1
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\reactores-pulsantes" -output-directory="..\salidas" reactores-pulsantes.tex || exit /b 1
node generar-web.cjs || exit /b 1
echo Cuadernillo PDF y paginas web actualizados.
