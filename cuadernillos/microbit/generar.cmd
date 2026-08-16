@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\microbit" mkdir "..\temporales\microbit"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\microbit" -output-directory="..\salidas" microbit.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\microbit.tex" "%CD%\..\..\curso-microbit-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\microbit.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
