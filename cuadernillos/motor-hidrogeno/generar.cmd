@echo off
setlocal
cd /d "%~dp0"
if not exist "..\temporales\motor-hidrogeno" mkdir "..\temporales\motor-hidrogeno"
if not exist "..\salidas" mkdir "..\salidas"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\motor-hidrogeno" -output-directory="..\salidas" motor-hidrogeno.tex || exit /b 1
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\motor-hidrogeno" -output-directory="..\salidas" motor-hidrogeno.tex || exit /b 1
node ..\plantilla\integrar-proyecto.cjs motor-hidrogeno || exit /b 1
echo Cuadernillo PDF y paginas web actualizados.
