@echo off
setlocal
cd /d "%~dp0"
if not exist "..\temporales\casa-campestre" mkdir "..\temporales\casa-campestre"
if not exist "..\salidas" mkdir "..\salidas"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\casa-campestre" -output-directory="..\salidas" casa-campestre.tex || exit /b 1
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\casa-campestre" -output-directory="..\salidas" casa-campestre.tex || exit /b 1
node ..\plantilla\integrar-proyecto.cjs casa-campestre || exit /b 1
echo Cuadernillo PDF y paginas web actualizados.
