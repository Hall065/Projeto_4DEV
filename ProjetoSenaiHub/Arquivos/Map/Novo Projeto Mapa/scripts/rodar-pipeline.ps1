# Pipeline completo do Novo Projeto Mapa: segmentação -> render por tipo -> plantas finais -> encaixe nos GLB -> montagem.
# Uso (de qualquer pasta): powershell -ExecutionPolicy Bypass -File "Arquivos\Map\Novo Projeto Mapa\scripts\rodar-pipeline.ps1" [pasta GLB]
# Requisitos: Windows PowerShell 5+ (System.Drawing) e Node 18+. Sem dependências npm.
param([string]$GlbDir)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$map = Split-Path -Parent $root
$config = Join-Path $root 'config\salas-config.json'
$dados = Join-Path $root 'dados'
$render = Join-Path $dados 'render'
$saida = Join-Path $root 'saida'
$work = Join-Path $root 'work'
if (-not $GlbDir) { $GlbDir = Join-Path (Split-Path -Parent (Split-Path -Parent $map)) 'Senai HUB\frontend\public\models\campus' }
foreach ($d in $render, $saida, $work) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
foreach ($ps in Get-ChildItem $here -Filter *.ps1) {
  $txt = [IO.File]::ReadAllText($ps.FullName, [Text.Encoding]::UTF8)
  [IO.File]::WriteAllText($ps.FullName, $txt, (New-Object Text.UTF8Encoding $true))
}
node (Join-Path $here 'png-rooms.mjs') (Join-Path $map 'PNG') $work
if ($LASTEXITCODE) { throw 'png-rooms falhou' }
node (Join-Path $here 'render-interpretado.mjs') $work $config $render
if ($LASTEXITCODE) { throw 'render-interpretado falhou' }
Copy-Item (Join-Path $render 'salas.csv') (Join-Path $dados 'salas.csv') -Force
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here 'compose-interpretado.ps1') $render $config $saida
node (Join-Path $here 'montagem-align.mjs') $GlbDir $render $config (Join-Path $work 'montagem.json')
if ($LASTEXITCODE) { throw 'montagem-align falhou' }
Copy-Item (Join-Path $work 'montagem.json') $dados -Force
Copy-Item (Join-Path $work 'juncao-*.png') $dados -Force
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here 'compose-montagem.ps1') $render (Join-Path $dados 'montagem.json') $config $saida
