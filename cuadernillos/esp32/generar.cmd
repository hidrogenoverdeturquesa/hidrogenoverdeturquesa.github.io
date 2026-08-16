@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\esp32" mkdir "..\temporales\esp32"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\esp32" -output-directory="..\salidas" esp32.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\esp32.tex" "%CD%\..\..\curso-esp32-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\esp32.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
