# Libère le port 8080 (ancienne instance backend Spring Boot).
$listeners = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
    Write-Host "Aucun processus n'écoute sur le port 8080." -ForegroundColor Green
    exit 0
}

$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "?" }
    Write-Host "Arrêt PID $pid ($name)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
$still = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($still) {
    Write-Host "Le port 8080 est toujours occupé. Fermez l'application manuellement." -ForegroundColor Red
    exit 1
}

Write-Host "Port 8080 libéré." -ForegroundColor Green
