@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\electrolizadores" mkdir "..\temporales\electrolizadores"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\electrolizadores" -output-directory="..\salidas" electrolizadores.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\electrolizadores.tex" "%CD%\..\..\curso-electrolizadores-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\electrolizadores.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
