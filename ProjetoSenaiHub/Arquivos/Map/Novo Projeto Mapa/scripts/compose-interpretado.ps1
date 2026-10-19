# Monta os mapas interpretados finais a partir de fill-N.png + labels-N.json (render-interpretado.mjs).
# Uso: powershell -File compose-interpretado.ps1 <pasta-render> <salas-config.json> <pasta-saida>
param([string]$RenderDir, [string]$ConfigPath, [string]$OutDir)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$cfg = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
$navy = [Drawing.ColorTranslator]::FromHtml('#021A3A'); $red = [Drawing.ColorTranslator]::FromHtml('#e30613')
$ink = [Drawing.ColorTranslator]::FromHtml('#1D2433'); $muted = [Drawing.ColorTranslator]::FromHtml('#5B6676')
$zoom = 1.3; $panelW = 440; $headerH = 104; $footerH = 46; $pad = 28

function Get-ContentBox([Drawing.Bitmap]$bmp) {
  $rect = New-Object Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $data = $bmp.LockBits($rect, [Drawing.Imaging.ImageLockMode]::ReadOnly, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $bytes = New-Object byte[] ($data.Stride * $bmp.Height)
  [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $x0 = $bmp.Width; $y0 = $bmp.Height; $x1 = 0; $y1 = 0
  for ($y = 0; $y -lt $bmp.Height; $y += 2) {
    $row = $y * $data.Stride
    for ($x = 0; $x -lt $bmp.Width; $x += 2) {
      $o = $row + $x * 3
      if ($bytes[$o] -lt 250 -or $bytes[$o + 1] -lt 250 -or $bytes[$o + 2] -lt 250) {
        if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($y -gt $y1) { $y1 = $y }
      }
    }
  }
  return @($x0, $y0, $x1, $y1)
}

$sf = New-Object Drawing.StringFormat
$sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
$sfLeft = New-Object Drawing.StringFormat
$sfLeft.LineAlignment = 'Center'; $sfLeft.Trimming = 'EllipsisCharacter'; $sfLeft.FormatFlags = 'NoWrap'

function Fit-Label($g, [string]$text, [double]$maxW, [double]$maxH) {
  for ($fs = 17; $fs -ge 9; $fs--) {
    $f = New-Object Drawing.Font('Segoe UI Semibold', $fs, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
    $wordsOk = $true
    foreach ($word in ($text -split '\s+')) { if ($g.MeasureString($word, $f).Width -gt $maxW) { $wordsOk = $false; break } }
    if ($wordsOk) {
      $sz = $g.MeasureString($text, $f, [int][Math]::Max(1, $maxW), $sf)
      if ($sz.Height -le $maxH) { return ,@($f, $sz) }
    }
    $f.Dispose()
  }
  return $null
}

foreach ($page in 1..7) {
  $lab = Get-Content -Raw -Encoding UTF8 (Join-Path $RenderDir "labels-$page.json") | ConvertFrom-Json
  $fill = New-Object Drawing.Bitmap (Join-Path $RenderDir "fill-$page.png")
  $box = Get-ContentBox $fill
  $cx0 = [Math]::Max(0, $box[0] - 10); $cy0 = [Math]::Max(0, $box[1] - 10)
  $cw = [Math]::Min($fill.Width, $box[2] + 12) - $cx0; $ch = [Math]::Min($fill.Height, $box[3] + 12) - $cy0
  $mapW = [int]($cw * $zoom); $mapH = [int]($ch * $zoom)

  $rows = @($lab.salas | Where-Object { $_.tipo -ne 'circ' -and $_.tipo -ne 'escada' -and $_.tipo -ne 'externo' -or $_.nome -match 'Área|Passarela|Jardim|Caçambas|Vão' })
  $tiposPresentes = @($lab.salas | ForEach-Object { $_.tipo } | Select-Object -Unique)
  $rowH = 21
  $panelNeed = 70 + $rows.Count * $rowH + 40 + ($tiposPresentes.Count + 1) * 24 + 30
  $bodyH = [Math]::Max($mapH + 2 * $pad, $panelNeed)
  $W = $mapW + 2 * $pad + $panelW; $H = $headerH + $bodyH + $footerH

  $out = New-Object Drawing.Bitmap -ArgumentList ([int]$W), ([int]$H)
  $g = [Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'ClearTypeGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear([Drawing.Color]::White)

  $g.FillRectangle((New-Object Drawing.SolidBrush $navy), 0, 0, $W, $headerH)
  $g.FillRectangle((New-Object Drawing.SolidBrush $red), 0, $headerH - 6, $W, 6)
  $fSmall = New-Object Drawing.Font('Segoe UI', 14, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  $fTitle = New-Object Drawing.Font('Segoe UI Semibold', 34, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  $white = New-Object Drawing.SolidBrush ([Drawing.Color]::White)
  $soft = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(190, 205, 225))
  $g.DrawString('SENAI HUB  ·  MAPA INTERPRETADO  ·  ESCOLA SENAI "LUIZ VARGA"', $fSmall, $soft, $pad, 16)
  $g.DrawString($lab.titulo, $fTitle, $white, $pad - 2, 38)
  $note = 'Fontes: planta PNG (Arquivos/Map) + mapa de risco CIPA (Scan)'
  $nsz = $g.MeasureString($note, $fSmall)
  $g.DrawString($note, $fSmall, $soft, $W - $pad - $nsz.Width, 16)

  $mx = $pad; $my = $headerH + $pad
  $g.DrawImage($fill, (New-Object Drawing.Rectangle $mx, $my, $mapW, $mapH), (New-Object Drawing.Rectangle $cx0, $cy0, $cw, $ch), [Drawing.GraphicsUnit]::Pixel)

  $inkBrush = New-Object Drawing.SolidBrush $ink
  $navyBrush = New-Object Drawing.SolidBrush $navy
  $fBadge = New-Object Drawing.Font('Segoe UI Semibold', 11, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  foreach ($s in $lab.salas) {
    $px = $mx + ($s.x - $cx0) * $zoom; $py = $my + ($s.y - $cy0) * $zoom
    $bw = $s.boxW * $zoom * 0.88; $bh = $s.boxH * $zoom * 0.82
    $isList = $rows | Where-Object { $_.num -eq $s.num }
    $fit = if ($bw -gt 26 -and $bh -gt 22) { Fit-Label $g $s.nome $bw ($bh - ($(if ($isList) { 22 } else { 0 }))) } else { $null }
    $textH = 0
    if ($fit) {
      $f = $fit[0]; $sz = $fit[1]; $textH = $sz.Height
      $ty = if ($isList) { $py + 10 } else { $py }
      $g.DrawString($s.nome, $f, $inkBrush, (New-Object Drawing.RectangleF ([float]($px - $bw / 2)), ([float]($ty - $sz.Height / 2)), ([float]$bw), ([float]$sz.Height)), $sf)
      $f.Dispose()
    }
    if ($isList) {
      $r = 10
      $by = if ($fit) { $py + 10 - $textH / 2 - $r - 2 } else { $py }
      $g.FillEllipse($navyBrush, [float]($px - $r), [float]($by - $r), [float](2 * $r), [float](2 * $r))
      $g.DrawString([string]$s.num, $fBadge, $white, (New-Object Drawing.RectangleF ([float]($px - $r - 4)), ([float]($by - $r)), ([float](2 * $r + 8)), ([float](2 * $r))), $sf)
    }
  }

  $panX = $mapW + 2 * $pad; $panY = $headerH + $pad
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#F6F7F9'))), $panX - 8, $headerH + 6, $panelW + 8, $bodyH - 6)
  $fHead = New-Object Drawing.Font('Segoe UI Semibold', 16, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  $fRow = New-Object Drawing.Font('Segoe UI', 13, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  $fRowB = New-Object Drawing.Font('Segoe UI Semibold', 13, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
  $mutedBrush = New-Object Drawing.SolidBrush $muted
  $g.DrawString("Ambientes ($($rows.Count))", $fHead, $navyBrush, $panX + 8, $panY)
  $g.DrawString('m² aprox.', $fRow, $mutedBrush, $panX + $panelW - 86, $panY + 2)
  $y = $panY + 34
  foreach ($s in $rows) {
    $col = [Drawing.ColorTranslator]::FromHtml($cfg.tipos.($s.tipo)[1]); $edge = [Drawing.ColorTranslator]::FromHtml($cfg.tipos.($s.tipo)[2])
    $g.FillRectangle((New-Object Drawing.SolidBrush $col), $panX + 8, $y + 3, 14, 14)
    $g.DrawRectangle((New-Object Drawing.Pen $edge, 1.5), $panX + 8, $y + 3, 14, 14)
    $g.DrawString([string]$s.num, $fRowB, $navyBrush, (New-Object Drawing.RectangleF ([float]($panX + 26)), ([float]$y), 30, ([float]$rowH)), $sfLeft)
    $g.DrawString($s.nome, $fRow, $inkBrush, (New-Object Drawing.RectangleF ([float]($panX + 56)), ([float]$y), ([float]($panelW - 140)), ([float]$rowH)), $sfLeft)
    $a = ('{0:N1}' -f [double]$s.area)
    $asz = $g.MeasureString($a, $fRow)
    $g.DrawString($a, $fRow, $mutedBrush, (New-Object Drawing.RectangleF ([float]($panX + $panelW - 16 - $asz.Width)), ([float]$y), ([float]($asz.Width + 4)), ([float]$rowH)), $sfLeft)
    $y += $rowH
  }
  $y += 18
  $g.DrawString('Legenda', $fHead, $navyBrush, $panX + 8, $y); $y += 28
  $i = 0
  foreach ($t in @('aula', 'lab', 'oficina', 'adm', 'sanit', 'apoio', 'conv', 'escada', 'externo', 'circ')) {
    if ($tiposPresentes -notcontains $t -and $t -ne 'circ') { continue }
    $col = [Drawing.ColorTranslator]::FromHtml($cfg.tipos.$t[1]); $edge = [Drawing.ColorTranslator]::FromHtml($cfg.tipos.$t[2])
    $lx = $panX + 8; $ly = $y + $i * 24
    $g.FillRectangle((New-Object Drawing.SolidBrush $col), $lx, $ly + 3, 16, 16)
    $g.DrawRectangle((New-Object Drawing.Pen $edge, 1.5), $lx, $ly + 3, 16, 16)
    $g.DrawString($cfg.tipos.$t[0], $fRow, $inkBrush, $lx + 22, $ly + 2)
    $i++
  }

  $fy = $headerH + $bodyH
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#EEF1F5'))), 0, $fy, $W, $footerH)
  $foot = 'Orientação igual à do mapa de risco (texto na horizontal).  Áreas pela escala do Sweet Home 3D.  (?) = leitura incerta no scan.  Gerado em ' + (Get-Date -Format 'dd/MM/yyyy')
  $g.DrawString($foot, $fRow, $mutedBrush, $pad, $fy + 14)

  $g.Dispose(); $fill.Dispose()
  $out.Save((Join-Path $OutDir "$($lab.arquivo).png"), [Drawing.Imaging.ImageFormat]::Png); $out.Dispose()
  Write-Output "$($lab.arquivo).png  ${W}x${H}"
}
