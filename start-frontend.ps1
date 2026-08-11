# Fix broken ComSpec (PostgreSQL installer sometimes overwrites this)
if ($env:ComSpec -like '*PostgreSQL*') {
  $env:ComSpec = 'C:\Windows\System32\cmd.exe'
}
$env:PATH = ($env:PATH -split ';' | Where-Object { $_ -and $_ -ne 'C:\Program Files\PostgreSQL\18\bin' }) -join ';'

Write-Host "Starting Mini ERP Frontend on http://localhost:5173" -ForegroundColor Green
Set-Location $PSScriptRoot\frontend
node node_modules/vite/bin/vite.js
