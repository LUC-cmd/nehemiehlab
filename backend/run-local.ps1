# Démarre le backend (libère le port 8080 puis charge backend/.env).
$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Fichier manquant : backend/.env" -ForegroundColor Red
    Write-Host "Copiez .env.example vers .env et configurez DB_PASSWORD."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

if (-not $env:DB_PASSWORD -or $env:DB_PASSWORD -eq "change-me") {
    Write-Host "DB_PASSWORD n'est pas configuré dans backend/.env" -ForegroundColor Red
    exit 1
}

$listener = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    Write-Host "Arrêt de l'ancienne instance backend (PID $($listener.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Démarrage backend (profil local)..." -ForegroundColor Cyan
mvn spring-boot:run
