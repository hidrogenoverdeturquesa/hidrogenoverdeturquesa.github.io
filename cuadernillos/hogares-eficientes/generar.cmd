@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\hogares-eficientes" mkdir "..\temporales\hogares-eficientes"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\hogares-eficientes" -output-directory="..\salidas" hogares-eficientes.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\hogares-eficientes.tex" "%CD%\..\..\proyecto-hogares-eficientes-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\hogares-eficientes.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
