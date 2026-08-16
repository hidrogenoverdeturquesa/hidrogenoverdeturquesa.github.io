@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\hidroecocaja" mkdir "..\temporales\hidroecocaja"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\hidroecocaja" -output-directory="..\salidas" hidroecocaja.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\hidroecocaja.tex" "%CD%\..\..\proyecto-hidroecocaja-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\hidroecocaja.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
