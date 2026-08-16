@echo off
setlocal
cd /d "%~dp0"

if not exist "..\salidas" mkdir "..\salidas"
if not exist "..\temporales\sistemas-viento-agua" mkdir "..\temporales\sistemas-viento-agua"

echo Compilando el PDF de Sistemas de energia del viento y del agua...
pdflatex -interaction=nonstopmode -halt-on-error -aux-directory="..\temporales\sistemas-viento-agua" -output-directory="..\salidas" sistemas-viento-agua.tex || goto :error

echo Generando la pagina web publicable...
node "..\plantilla\generar-html.js" "%CD%\sistemas-viento-agua.tex" "%CD%\..\..\proyecto-granja-eolica-latex.html" || goto :error

echo.
echo Generacion terminada correctamente.
echo PDF:  ..\salidas\sistemas-viento-agua.pdf
echo HTML: ..\..\proyecto-granja-eolica-latex.html
pause
exit /b 0

:error
echo.
echo No se pudo completar la generacion. Revisa el mensaje anterior.
pause
exit /b 1
