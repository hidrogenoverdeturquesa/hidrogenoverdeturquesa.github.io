@echo off
setlocal
cd /d "%~dp0"

if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\ecoaldea" mkdir "..\temporales\ecoaldea"

echo Compilando el PDF de Ecoaldea Sostenible...
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\ecoaldea" -output-directory="..\salidas" ecoaldea.tex || goto :error

echo Generando la pagina web publicable...
node "..\plantilla\generar-html.js" "%CD%\ecoaldea.tex" "%CD%\..\..\proyecto-ecoaldea-latex.html" || goto :error

echo.
echo Generacion terminada correctamente.
echo PDF:  ..\salidas\ecoaldea.pdf
echo HTML: ..\..\proyecto-ecoaldea-latex.html
pause
exit /b 0

:error
echo.
echo No se pudo completar la generacion. Revisa el mensaje anterior.
pause
exit /b 1
