# Mini ERP + CRM - Start Script (Windows PowerShell)
# Run from project root: .\start.ps1

Write-Host "=== Mini ERP + CRM ===" -ForegroundColor Cyan

# Check PostgreSQL service
$pgService = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -ne "Running") {
    Write-Host "PostgreSQL is stopped. Starting service (may need Admin)..." -ForegroundColor Yellow
    try {
        Start-Service postgresql-x64-18 -ErrorAction Stop
        Write-Host "PostgreSQL started." -ForegroundColor Green
    } catch {
        Write-Host "Could not start PostgreSQL. Run PowerShell AS ADMINISTRATOR and execute:" -ForegroundColor Red
        Write-Host "  net start postgresql-x64-18" -ForegroundColor White
        Write-Host "Or reinstall PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    }
}

# Fix broken PATH entry if present
$fixedPath = ($env:PATH -split ';' | Where-Object { $_ -and $_ -ne 'C:\Program Files\PostgreSQL\18\bin' }) -join ';'
$env:PATH = $fixedPath

# Backend setup
Write-Host "`nSetting up backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

# Try migrate + seed (ignore errors if DB not ready)
node node_modules/prisma/build/index.js migrate deploy 2>$null
if ($LASTEXITCODE -eq 0) {
    node node_modules/tsx/dist/cli.mjs prisma/seed.ts 2>$null
    Write-Host "Database ready." -ForegroundColor Green
} else {
    Write-Host "Database not ready - login will fail until PostgreSQL is running." -ForegroundColor Yellow
}

# Start backend in new window
Write-Host "Starting backend on http://localhost:5000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node node_modules/tsx/dist/cli.mjs watch src/server.ts"

# Start frontend in new window
Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; node node_modules/vite/bin/vite.js"

Write-Host "`n=== Ready ===" -ForegroundColor Green
Write-Host "Open: http://localhost:5173"
Write-Host "Login: admin@erp.local / Pass@123"
Set-Location $PSScriptRoot
