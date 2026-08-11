# One-time setup script for Mini ERP + CRM
param(
  [string]$PgPassword = "postgres"
)

$ErrorActionPreference = "Stop"

if ($env:ComSpec -like '*PostgreSQL*') {
  $env:ComSpec = 'C:\Windows\System32\cmd.exe'
}
$env:PATH = ($env:PATH -split ';' | Where-Object { $_ -and $_ -ne 'C:\Program Files\PostgreSQL\18\bin' }) -join ';'

Write-Host "=== Mini ERP Setup ===" -ForegroundColor Cyan

# Backend deps
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path node_modules)) {
  Write-Host "Installing backend dependencies..."
  npm install --ignore-scripts
}
node node_modules/prisma/build/index.js generate

# Ensure migration SQL is valid UTF-8
node scripts/write-migration.js

# Database
$env:PGPASSWORD = $PgPassword
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -h localhost -d postgres -c "SELECT 1" | Out-Null
& $psql -U postgres -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='mini_erp_crm'" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL connection failed. Check password." }

$dbExists = (& $psql -U postgres -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='mini_erp_crm'").Trim()
if ($dbExists -ne "1") {
  & $psql -U postgres -h localhost -d postgres -c "CREATE DATABASE mini_erp_crm;"
}

$tables = (& $psql -U postgres -h localhost -d mini_erp_crm -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name != '_prisma_migrations'").Trim()
if ($tables -eq "0") {
  Write-Host "Applying database schema..."
  & $psql -U postgres -h localhost -d mini_erp_crm -f "$PSScriptRoot\backend\prisma\migrations\20260811120000_init\migration.sql"
  node node_modules/prisma/build/index.js migrate resolve --applied 20260811120000_init
}

Write-Host "Seeding database..."
node node_modules/tsx/dist/cli.mjs prisma/seed.ts

# Frontend deps
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path node_modules)) {
  Write-Host "Installing frontend dependencies..."
  npm install --ignore-scripts
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Run start-backend.ps1 and start-frontend.ps1 in separate terminals."
Write-Host "Login: admin@erp.local / Pass@123"
