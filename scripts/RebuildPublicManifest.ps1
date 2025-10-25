$mf   = "..\public\manifest.json"
$path = "..\public\data\fabrication_requirements"

$j = Get-Content $mf -Raw | ConvertFrom-Json
$files = (Get-ChildItem -Path $path -File -Filter *.csv | Select-Object -ExpandProperty Name | Sort-Object)

# Find the first set whose path matches and overwrite its files
$set = $j.sets | Where-Object { $_.path -eq "data/fabrication_requirements/" } | Select-Object -First 1
if (-not $set) { throw "No set with path 'data/fabrication_requirements/' found in manifest.json." }
$set.files = $files

$j | ConvertTo-Json -Depth 8 | Set-Content $mf -Encoding UTF8

Write-Host "Rebuilt manifest.json from directory. Restart Vite and hard-refresh."