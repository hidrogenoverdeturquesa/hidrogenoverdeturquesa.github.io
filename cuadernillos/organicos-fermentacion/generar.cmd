@echo off
setlocal
cd /d "%~dp0"
if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\organicos-fermentacion" mkdir "..\temporales\organicos-fermentacion"
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\organicos-fermentacion" -output-directory="..\salidas" organicos-fermentacion.tex || goto :error
node "..\plantilla\generar-html.js" "%CD%\organicos-fermentacion.tex" "%CD%\..\..\curso-organicos-fermentacion-latex.html" || goto :error
echo Generacion terminada. PDF: ..\salidas\organicos-fermentacion.pdf
pause
exit /b 0
:error
echo No se pudo completar la generacion.
pause
exit /b 1
