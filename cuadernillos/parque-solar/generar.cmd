@echo off
setlocal
cd /d "%~dp0"

if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\parque-solar" mkdir "..\temporales\parque-solar"

echo Compilando el PDF de Parque Solar...
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\parque-solar" -output-directory="..\salidas" parque-solar.tex || goto :error

echo Generando la pagina web publicable...
node "..\plantilla\generar-html.js" "%CD%\parque-solar.tex" "%CD%\..\..\proyecto-parque-solar-latex.html" || goto :error

echo.
echo Generacion terminada correctamente.
echo PDF:  ..\salidas\parque-solar.pdf
echo HTML: ..\..\proyecto-parque-solar-latex.html
pause
exit /b 0

:error
echo.
echo No se pudo completar la generacion. Revisa el mensaje anterior.
pause
exit /b 1
