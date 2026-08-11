# Fix broken ComSpec (PostgreSQL installer sometimes overwrites this)
if ($env:ComSpec -like '*PostgreSQL*') {
  $env:ComSpec = 'C:\Windows\System32\cmd.exe'
}
# Remove broken standalone PostgreSQL PATH entry
$env:PATH = ($env:PATH -split ';' | Where-Object { $_ -and $_ -ne 'C:\Program Files\PostgreSQL\18\bin' }) -join ';'

Write-Host "Starting Mini ERP Backend on http://localhost:5000" -ForegroundColor Green
Set-Location $PSScriptRoot\backend
node node_modules/tsx/dist/cli.mjs watch src/server.ts
