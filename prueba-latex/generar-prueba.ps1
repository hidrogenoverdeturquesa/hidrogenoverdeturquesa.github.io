$ErrorActionPreference = 'Stop'
$carpetaPrueba = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location $carpetaPrueba
try {
    Write-Host 'Generando la pagina web de prueba...'
    & node '.\generar-html.js'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el HTML.' }

    Write-Host 'Generando el PDF desde el mismo diseno web...'
    $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    $html = (Resolve-Path '..\prueba-cuadernillo-latex.html').Path.Replace('\', '/')
    $pdf = Join-Path $carpetaPrueba 'cuadernillo-prueba-web.pdf'
    & $edge '--headless=new' '--disable-gpu' '--no-pdf-header-footer' '--print-to-pdf-no-header' "--print-to-pdf=$pdf" "file:///$html"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el PDF desde la pagina web.' }

    Write-Host ''
    Write-Host 'Prueba generada correctamente.' -ForegroundColor Green
    Write-Host "HTML: $((Resolve-Path '..\prueba-cuadernillo-latex.html').Path)"
    Write-Host "PDF:  $((Resolve-Path '.\cuadernillo-prueba-web.pdf').Path)"
}
finally {
    Pop-Location
}
