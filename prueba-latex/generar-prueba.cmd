@echo off
setlocal
cd /d "%~dp0"
echo Generando la pagina web de prueba...
node generar-html.js || goto :error
echo Generando el PDF desde el mismo diseno web...
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "HTML=file:///%CD:\=/%/../prueba-cuadernillo-latex.html"
set "PDF=%CD%\cuadernillo-prueba-web.pdf"
"%EDGE%" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header --print-to-pdf="%PDF%" "%HTML%" || goto :error
echo.
echo Prueba generada correctamente.
echo HTML: ..\prueba-cuadernillo-latex.html
echo PDF:  cuadernillo-prueba-web.pdf
pause
exit /b 0

:error
echo.
echo No se pudo completar la generacion. Revisa el mensaje anterior.
pause
exit /b 1
