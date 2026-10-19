# Monta as plantas interpretadas na posição real dos blocos (a mesma do mapa 3D do site):
#   Montagem-implantacao.png  vista de cima, térreo e superior lado a lado
#   Montagem-explodida.png    vista isométrica com os pavimentos afastados na vertical
# Uso: powershell -File compose-montagem.ps1 <render-dir> <montagem.json> <salas-config.json> <out-dir>
param([string]$RenderDir, [string]$MontagemJson, [string]$ConfigPath, [string]$OutDir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$mj = Get-Content $MontagemJson -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$br = [Globalization.CultureInfo]'pt-BR'

$navy = [Drawing.Color]::FromArgb(2, 26, 58)
$hubRed = [Drawing.Color]::FromArgb(227, 6, 19)
$ink = [Drawing.Color]::FromArgb(30, 38, 51)
$muted = [Drawing.Color]::FromArgb(92, 104, 120)
$blockColor = @{
  A = [Drawing.Color]::FromArgb(227, 6, 19); B = [Drawing.Color]::FromArgb(37, 99, 235)
  C = [Drawing.Color]::FromArgb(22, 163, 74); D = [Drawing.Color]::FromArgb(234, 140, 0)
}
$terreos = @('1', '3', '4', '6')
$superiores = @('2', '5', '7')
$allPages = $terreos + $superiores

function Hex([string]$h) { [Drawing.Color]::FromArgb([Convert]::ToInt32($h.Substring(1, 2), 16), [Convert]::ToInt32($h.Substring(3, 2), 16), [Convert]::ToInt32($h.Substring(5, 2), 16)) }
function Fmt([double]$v) { [string]::Format($br, '{0:0.0}', $v) }
function ToWorld($pg, [double]$X, [double]$Y) {
  $u = $X / $pg.img.pxPorMetro; $v = $Y / $pg.img.pxPorMetro
  @(($pg.s * ($pg.M[0] * $u + $pg.M[1] * $v) + $pg.t[0]), ($pg.s * ($pg.M[2] * $u + $pg.M[3] * $v) + $pg.t[1]))
}
function BoxWorld($pg) {
  $b = $pg.img.caixa
  @((ToWorld $pg $b[0] $b[1]), (ToWorld $pg $b[2] $b[1]), (ToWorld $pg $b[2] $b[3]), (ToWorld $pg $b[0] $b[3]))
}
function PavName($pg) { if ($pg.nivel -eq 0) { if ($pg.bloco -eq 'C') { 'Inferior' } elseif ($pg.bloco -eq 'B') { 'Único' } else { 'Térreo' } } else { 'Superior' } }

$imgs = @{}; $labels = @{}
foreach ($k in $allPages) {
  $imgs[$k] = [Drawing.Bitmap]::FromFile((Join-Path $RenderDir "fill-$k.png"))
  $labels[$k] = Get-Content (Join-Path $RenderDir "labels-$k.json") -Raw -Encoding UTF8 | ConvertFrom-Json
}
function NewAttr([float]$alpha) {
  $ia = New-Object Drawing.Imaging.ImageAttributes
  $ia.SetColorKey([Drawing.Color]::FromArgb(250, 250, 250), [Drawing.Color]::FromArgb(255, 255, 255))
  if ($alpha -lt 1) {
    $cm = New-Object Drawing.Imaging.ColorMatrix
    $cm.Matrix33 = $alpha
    $ia.SetColorMatrix($cm)
  }
  $ia
}
$attrFull = NewAttr 1
$attrGhost = NewAttr 0.22

function DrawPlan($g, $k, $proj, $attr) {
  $pg = $mj.paginas.$k; $im = $imgs[$k]
  $pts = [Drawing.PointF[]]@(
    (& $proj (ToWorld $pg 0 0) $pg), (& $proj (ToWorld $pg $im.Width 0) $pg), (& $proj (ToWorld $pg 0 $im.Height) $pg))
  $g.DrawImage($im, $pts, (New-Object Drawing.RectangleF 0, 0, $im.Width, $im.Height), [Drawing.GraphicsUnit]::Pixel, $attr)
}
$juncImgs = @{}
foreach ($jn in $mj.juncoes) { $juncImgs[$jn.imagem] = [Drawing.Bitmap]::FromFile((Join-Path (Split-Path $MontagemJson) $jn.imagem)) }
function DrawJunctions($g, [int]$nivel, $proj, $attr) {
  foreach ($jn in ($mj.juncoes | Where-Object { $_.nivel -eq $nivel })) {
    $im = $juncImgs[$jn.imagem]; $r = $jn.retangulo
    $pts = [Drawing.PointF[]]@((& $proj @($r[0], $r[1]) $null), (& $proj @($r[2], $r[1]) $null), (& $proj @($r[0], $r[3]) $null))
    $g.DrawImage($im, $pts, (New-Object Drawing.RectangleF 0, 0, $im.Width, $im.Height), [Drawing.GraphicsUnit]::Pixel, $attr)
  }
}
$site = $cfg.implantacao
$siteStyle = @{
  estacionamento = @{ fill = [Drawing.Color]::FromArgb(212, 217, 225); line = [Drawing.Color]::FromArgb(110, 122, 140); txt = 'Estacionamento' }
  circulacao     = @{ fill = [Drawing.Color]::FromArgb(247, 241, 222); line = [Drawing.Color]::FromArgb(200, 184, 140); txt = 'Circulação externa' }
  rampa          = @{ fill = [Drawing.Color]::FromArgb(247, 234, 207); line = [Drawing.Color]::FromArgb(183, 121, 31); txt = 'Rampa (acerto de desnível)' }
}
$fenceCol = [Drawing.Color]::FromArgb(124, 58, 237); $gateCol = [Drawing.Color]::FromArgb(120, 128, 140); $stepCol = [Drawing.Color]::FromArgb(217, 119, 6); $edgeCol = [Drawing.Color]::FromArgb(201, 31, 168)
function SitePts($pts, $proj) { [Drawing.PointF[]]@($pts | ForEach-Object { & $proj @([double]$_[0], [double]$_[1]) $null }) }
function Hatch([Drawing.Color]$fore) { New-Object Drawing.Drawing2D.HatchBrush ([Drawing.Drawing2D.HatchStyle]::WideUpwardDiagonal), $fore, ([Drawing.Color]::Transparent) }
function WithAlpha([Drawing.Color]$c, [float]$alpha) { [Drawing.Color]::FromArgb([int]($c.A * $alpha), $c) }
function DrawSiteAreas($g, $proj, [float]$alpha) {
  if (-not $site) { return }
  foreach ($a in $site.areas) {
    $st = $siteStyle[$a.tipo]; $poly = SitePts $a.poly $proj
    $g.FillPolygon((New-Object Drawing.SolidBrush (WithAlpha $st.fill $alpha)), $poly)
    if ($a.tipo -eq 'rampa') { $g.FillPolygon((Hatch (WithAlpha ([Drawing.Color]::FromArgb(150, $st.line)) $alpha)), $poly) }
    if ($a.contorno -ne $false) { $g.DrawPolygon((New-Object Drawing.Pen (WithAlpha $st.line $alpha), 1.4), $poly) }
  }
}
function Arrow($g, [Drawing.Color]$c, [float]$w, [Drawing.PointF]$p0, [Drawing.PointF]$p1) {
  $pen = New-Object Drawing.Pen $c, $w
  $pen.CustomEndCap = New-Object Drawing.Drawing2D.AdjustableArrowCap 4, 4
  $g.DrawLine($pen, $p0, $p1)
}
function SiteTag($g, [string]$txt, [Drawing.PointF]$p, [Drawing.Color]$c, [float]$size, [bool]$bold) {
  $f = New-Object Drawing.Font 'Segoe UI', $size, $(if ($bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular })
  $sz = $g.MeasureString($txt, $f)
  $r = New-Object Drawing.RectangleF ($p.X - $sz.Width / 2 - 3), ($p.Y - $sz.Height / 2), ($sz.Width + 6), $sz.Height
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(225, 255, 255, 255))), $r)
  $g.DrawString($txt, $f, (New-Object Drawing.SolidBrush $c), ($r.X + 3), $r.Y)
}
function DrawSiteOverlay($g, $proj) {
  if (-not $site) { return }
  foreach ($e in $site.escadas) {
    $r = $e.rect; $p0 = & $proj @($r[0], $r[1]) $null; $p1 = & $proj @($r[2], $r[3]) $null
    $x0 = [Math]::Min($p0.X, $p1.X); $y0 = [Math]::Min($p0.Y, $p1.Y); $w = [Math]::Abs($p1.X - $p0.X); $h = [Math]::Abs($p1.Y - $p0.Y)
    $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(254, 236, 205))), [float]$x0, [float]$y0, [float]$w, [float]$h)
    $pen = New-Object Drawing.Pen $stepCol, 1.6
    $n = [int]$e.degraus
    for ($i = 1; $i -lt $n; $i++) {
      if ($h -ge $w) { $xx = $x0 + $w * $i / $n; $g.DrawLine($pen, [float]$xx, [float]$y0, [float]$xx, [float]($y0 + $h)) }
      else { $yy = $y0 + $h * $i / $n; $g.DrawLine($pen, [float]$x0, [float]$yy, [float]($x0 + $w), [float]$yy) }
    }
    $g.DrawRectangle($pen, [float]$x0, [float]$y0, [float]$w, [float]$h)
  }
  foreach ($l in $site.linhas) {
    $pts = SitePts $l.pts $proj
    switch ($l.tipo) {
      'grade' { $pen = New-Object Drawing.Pen $fenceCol, 3.2; $g.DrawLines($pen, $pts) }
      'portao' { $pen = New-Object Drawing.Pen $gateCol, 4.5; $pen.DashStyle = 'Dash'; $g.DrawLines($pen, $pts) }
      'desnivel' { $pen = New-Object Drawing.Pen $edgeCol, 2.6; $pen.DashStyle = 'DashDot'; $g.DrawLines($pen, $pts) }
    }
  }
  foreach ($d in $site.portas) { Arrow $g $fenceCol 2.6 (& $proj @($d.de[0], $d.de[1]) $null) (& $proj @($d.ate[0], $d.ate[1]) $null) }
  foreach ($a in $site.areas) {
    if ($a.tipo -eq 'circulacao') { continue }
    $poly = SitePts $a.poly $proj
    $cxp = ($poly | ForEach-Object { $_.X } | Measure-Object -Average).Average; $cyp = ($poly | ForEach-Object { $_.Y } | Measure-Object -Average).Average
    $c = New-Object Drawing.PointF ([float]$cxp), ([float]$cyp)
    if ($a.tipo -eq 'estacionamento') {
      SiteTag $g $a.nome $c $navy 15 $true
      SiteTag $g $a.detalhe (New-Object Drawing.PointF $c.X, ($c.Y + 22)) $muted 9 $false
    } else { SiteTag $g $a.nome $c $siteStyle[$a.tipo].line 9.5 $true }
  }
  foreach ($l in ($site.linhas | Where-Object { $_.nome })) {
    $pts = SitePts $l.pts $proj
    $mx = ($pts[0].X + $pts[-1].X) / 2; $my = ($pts[0].Y + $pts[-1].Y) / 2
    $vert = [Math]::Abs($pts[-1].X - $pts[0].X) -lt [Math]::Abs($pts[-1].Y - $pts[0].Y)
    $col = $(if ($l.tipo -eq 'portao') { $gateCol } else { $edgeCol })
    if ($vert) { SiteTag $g $l.nome (New-Object Drawing.PointF ([float]($mx + 52)), ([float]$my)) $col 8.5 $false }
    else { SiteTag $g $l.nome (New-Object Drawing.PointF ([float]$mx), ([float]($my + 12))) $col 8.5 $false }
  }
  foreach ($d in ($site.portas | Where-Object { $_.nome })) { SiteTag $g $d.nome (& $proj @(($d.ate[0] + 6.5), $d.ate[1]) $null) $fenceCol 8.5 $false }
}
function SiteLegend($g, [float]$x, [float]$y) {
  $f = New-Object Drawing.Font 'Segoe UI', 11
  $g.DrawString('Implantação', (New-Object Drawing.Font 'Segoe UI Semibold', 12), (New-Object Drawing.SolidBrush $navy), $x, $y)
  $cx = $x + 110
  foreach ($t in 'estacionamento', 'circulacao', 'rampa') {
    $st = $siteStyle[$t]
    $g.FillRectangle((New-Object Drawing.SolidBrush $st.fill), $cx, $y + 4, 16, 16)
    if ($t -eq 'rampa') { $g.FillRectangle((Hatch ([Drawing.Color]::FromArgb(150, $st.line))), $cx, $y + 4, 16, 16) }
    $g.DrawRectangle((New-Object Drawing.Pen $st.line, 1.4), $cx, $y + 4, 16, 16)
    $g.DrawString($st.txt, $f, (New-Object Drawing.SolidBrush $ink), $cx + 20, $y + 2); $cx += $g.MeasureString($st.txt, $f).Width + 32
  }
  $items = @(
    @('Grade', (New-Object Drawing.Pen $fenceCol, 3.2)),
    @('Portão de pedestres', (& { $p = New-Object Drawing.Pen $gateCol, 4.5; $p.DashStyle = 'Dash'; $p })),
    @('Desnível sem grade nem parede', (& { $p = New-Object Drawing.Pen $edgeCol, 2.6; $p.DashStyle = 'DashDot'; $p })))
  foreach ($it in $items) {
    $g.DrawLine($it[1], [float]$cx, [float]($y + 12), [float]($cx + 26), [float]($y + 12))
    $g.DrawString($it[0], $f, (New-Object Drawing.SolidBrush $ink), $cx + 32, $y + 2); $cx += $g.MeasureString($it[0], $f).Width + 40
  }
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(254, 236, 205))), $cx, $y + 4, 16, 16)
  $g.DrawRectangle((New-Object Drawing.Pen $stepCol, 1.6), $cx, $y + 4, 16, 16); $g.DrawLine((New-Object Drawing.Pen $stepCol, 1.6), [float]($cx + 8), [float]($y + 4), [float]($cx + 8), [float]($y + 20))
  $g.DrawString('Escada externa', $f, (New-Object Drawing.SolidBrush $ink), $cx + 20, $y + 2); $cx += $g.MeasureString('Escada externa', $f).Width + 40
  Arrow $g $fenceCol 2.6 (New-Object Drawing.PointF $cx, ($y + 12)) (New-Object Drawing.PointF ($cx + 26), ($y + 12))
  $g.DrawString('Acesso por porta', $f, (New-Object Drawing.SolidBrush $ink), $cx + 32, $y + 2)
  $y + 30
}
function NewCanvas([int]$w, [int]$h) {
  $bmp = New-Object Drawing.Bitmap $w, $h
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBilinear'; $g.TextRenderingHint = 'ClearTypeGridFit'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([Drawing.Color]::White)
  @($bmp, $g)
}
function Header($g, [int]$w, [string]$title, [string]$sub) {
  $g.FillRectangle((New-Object Drawing.SolidBrush $navy), 0, 0, $w, 104)
  $g.FillRectangle((New-Object Drawing.SolidBrush $hubRed), 0, 104, $w, 6)
  $white = [Drawing.Brushes]::White
  $g.DrawString('SENAI HUB · MONTAGEM DO CAMPUS · ESCOLA SENAI "LUIZ VARGA"', (New-Object Drawing.Font 'Segoe UI', 11), (New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(190, 200, 220))), 28, 14)
  $g.DrawString($title, (New-Object Drawing.Font 'Segoe UI Semibold', 26), $white, 26, 34)
  $sf = New-Object Drawing.StringFormat; $sf.Alignment = 'Far'
  $g.DrawString($sub, (New-Object Drawing.Font 'Segoe UI', 11), (New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(190, 200, 220))), (New-Object Drawing.RectangleF 0, 16, ($w - 28), 80), $sf)
}
function Badge($g, [string]$id, [float]$cx, [float]$cy, [float]$r) {
  $g.FillEllipse((New-Object Drawing.SolidBrush $blockColor[$id]), $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $g.DrawEllipse((New-Object Drawing.Pen ([Drawing.Color]::White), 3), $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $sf = New-Object Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString($id, (New-Object Drawing.Font 'Segoe UI', ([float]($r * 0.95)), ([Drawing.FontStyle]::Bold)), [Drawing.Brushes]::White, (New-Object Drawing.RectangleF ($cx - $r), ($cy - $r + 1), (2 * $r), (2 * $r)), $sf)
}
function Legend($g, [float]$x, [float]$y, [float]$maxW) {
  $f = New-Object Drawing.Font 'Segoe UI', 11
  $fb = New-Object Drawing.Font 'Segoe UI Semibold', 12
  $g.DrawString('Blocos', $fb, (New-Object Drawing.SolidBrush $navy), $x, $y)
  $cx = $x + 80
  foreach ($id in 'A', 'B', 'C', 'D') { Badge $g $id ($cx + 11) ($y + 11) 11; $g.DrawString("Bloco $id", $f, (New-Object Drawing.SolidBrush $ink), $cx + 26, $y + 2); $cx += 110 }
  $g.DrawString('Ambientes', $fb, (New-Object Drawing.SolidBrush $navy), $cx + 20, $y)
  $cx += 120
  foreach ($t in $cfg.tipos.PSObject.Properties) {
    $txt = $t.Value[0]
    $tw = $g.MeasureString($txt, $f).Width + 34
    if ($cx + $tw -gt $x + $maxW) { $cx = $x + 410; $y += 26 }
    $g.FillRectangle((New-Object Drawing.SolidBrush (Hex $t.Value[1])), $cx, $y + 4, 16, 16)
    $g.DrawRectangle((New-Object Drawing.Pen (Hex $t.Value[2]), 1.5), $cx, $y + 4, 16, 16)
    $g.DrawString($txt, $f, (New-Object Drawing.SolidBrush $ink), $cx + 20, $y + 2)
    $cx += $tw
  }
  $y + 30
}

# ---------- vista de cima ----------
$minX = 1e9; $minZ = 1e9; $maxX = -1e9; $maxZ = -1e9
foreach ($k in $allPages) { foreach ($c in (BoxWorld $mj.paginas.$k)) { $minX = [Math]::Min($minX, $c[0]); $maxX = [Math]::Max($maxX, $c[0]); $minZ = [Math]::Min($minZ, $c[1]); $maxZ = [Math]::Max($maxZ, $c[1]) } }
$minX -= 14; $maxX += 14; $minZ -= 14; $maxZ += 14
$sc = 1500 / ($maxZ - $minZ)
$panelW = [int](($maxX - $minX) * $sc); $panelH = [int](($maxZ - $minZ) * $sc)
$pad = 36; $top = 110 + 70
$W = $pad * 3 + $panelW * 2; $H = $top + $panelH + 210
$cv = NewCanvas $W $H; $bmp = $cv[0]; $g = $cv[1]
Header $g $W 'Como as plantas se encaixam — vista de cima' "Cada planta interpretada está na posição do seu bloco no mapa 3D do site (GLB)`nencaixe automático pelas paredes · escala 1:1 com o modelo"

$fName = New-Object Drawing.Font 'Segoe UI', 8.5
$sfC = New-Object Drawing.StringFormat; $sfC.Alignment = 'Center'; $sfC.LineAlignment = 'Center'
for ($panel = 0; $panel -lt 2; $panel++) {
  $ox = $pad + $panel * ($panelW + $pad); $oy = $top
  $projTop = { param($wp, $pg) New-Object Drawing.PointF ([float]($ox + ($wp[0] - $minX) * $sc)), ([float]($oy + ($wp[1] - $minZ) * $sc)) }.GetNewClosure()
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(246, 248, 251))), $ox, $oy, $panelW, $panelH)
  $grid = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(228, 232, 238)), 1
  for ($gx = [Math]::Ceiling($minX / 10) * 10; $gx -le $maxX; $gx += 10) { $xx = $ox + ($gx - $minX) * $sc; $g.DrawLine($grid, [float]$xx, [float]$oy, [float]$xx, [float]($oy + $panelH)) }
  for ($gz = [Math]::Ceiling($minZ / 10) * 10; $gz -le $maxZ; $gz += 10) { $yy = $oy + ($gz - $minZ) * $sc; $g.DrawLine($grid, [float]$ox, [float]$yy, [float]($ox + $panelW), [float]$yy) }
  $ptitle = if ($panel -eq 0) { 'TÉRREO  (no Bloco C: pavimento inferior)' } else { 'PAVIMENTO SUPERIOR  (térreo em transparência por baixo)' }
  $g.DrawString($ptitle, (New-Object Drawing.Font 'Segoe UI Semibold', 15), (New-Object Drawing.SolidBrush $navy), $ox, $top - 40)
  $lista = if ($panel -eq 0) { $terreos } else { $superiores }
  DrawSiteAreas $g $projTop $(if ($panel -eq 0) { 1 } else { 0.35 })
  if ($panel -eq 1) { foreach ($k in $terreos) { DrawPlan $g $k $projTop $attrGhost }; DrawJunctions $g 0 $projTop $attrGhost }
  foreach ($k in $lista) { DrawPlan $g $k $projTop $attrFull }
  DrawJunctions $g $(if ($panel -eq 0) { 0 } else { 2 }) $projTop $attrFull
  if ($panel -eq 0) { DrawSiteOverlay $g $projTop }
  foreach ($k in $lista) {
    $pg = $mj.paginas.$k; $swap = [Math]::Abs($pg.M[0]) -lt 0.5
    foreach ($s in $labels[$k].salas) {
      if ($s.tipo -eq 'circ') { continue }
      $bw = $(if ($swap) { $s.boxH } else { $s.boxW }); $bh = $(if ($swap) { $s.boxW } else { $s.boxH })
      $bw = $bw / $pg.img.pxPorMetro * $sc * 0.92; $bh = $bh / $pg.img.pxPorMetro * $sc * 0.85
      if ($bw -lt 22 -or $bh -lt 11) { continue }
      $c = & $projTop (ToWorld $pg $s.x $s.y) $pg
      $rect = New-Object Drawing.RectangleF ($c.X - $bw / 2), ($c.Y - $bh / 2), $bw, $bh
      $need = $g.MeasureString($s.nome, $fName, [int]$bw)
      if ($need.Height -gt $bh) { continue }
      $g.DrawString($s.nome, $fName, (New-Object Drawing.SolidBrush $ink), $rect, $sfC)
    }
  }
  $blocos = if ($panel -eq 0) { @{ A = '1'; B = '3'; C = '4'; D = '6' } } else { @{ A = '2'; C = '5'; D = '7' } }
  foreach ($id in $blocos.Keys) {
    $pg = $mj.paginas.($blocos[$id]); $bx = BoxWorld $pg
    $p0 = & $projTop $bx[0] $pg; $p2 = & $projTop $bx[2] $pg
    $rx = [Math]::Min($p0.X, $p2.X) - 5; $ry = [Math]::Min($p0.Y, $p2.Y) - 5; $rw = [Math]::Abs($p2.X - $p0.X) + 10; $rh = [Math]::Abs($p2.Y - $p0.Y) + 10
    $pen = New-Object Drawing.Pen $blockColor[$id], 2.5; $pen.DashStyle = 'Dash'
    $g.DrawRectangle($pen, [float]$rx, [float]$ry, [float]$rw, [float]$rh)
    switch ($id) {
      'A' { $bxp = $rx + $rw / 2; $byp = $ry + $rh + 26 }
      'B' { $bxp = $rx - 26; $byp = $ry + $rh / 2 }
      default { $bxp = $rx + $rw / 2; $byp = $ry - 26 }
    }
    Badge $g $id $bxp $byp 20
    $tag = "Piso " + (Fmt $pg.pisoAltura_m) + " m" + $(if ($pg.ajuste.nota) { " · " + $pg.ajuste.nota } else { "" })
    if ($id -eq 'B') { $tx = $bxp - 28; $ty = $byp + 22 } else { $tx = $bxp + 24; $ty = $byp - 9 }
    $g.DrawString($tag, (New-Object Drawing.Font 'Segoe UI Semibold', 10), (New-Object Drawing.SolidBrush $blockColor[$id]), [float]$tx, [float]$ty)
  }
  $sbx = $ox + 20; $sby = $oy + $panelH - 30
  $g.FillRectangle((New-Object Drawing.SolidBrush $ink), [float]$sbx, [float]$sby, [float](10 * $sc), 6)
  $g.FillRectangle([Drawing.Brushes]::White, [float]($sbx + 10 * $sc), [float]$sby, [float](10 * $sc), 6)
  $g.DrawRectangle((New-Object Drawing.Pen $ink, 1), [float]$sbx, [float]$sby, [float](20 * $sc), 6)
  $g.DrawString('0          10          20 m', (New-Object Drawing.Font 'Segoe UI', 9), (New-Object Drawing.SolidBrush $ink), [float]($sbx - 3), [float]($sby + 8))
}
$ly = Legend $g $pad ($top + $panelH + 22) ($W - 2 * $pad)
$ly = SiteLegend $g $pad ($ly + 2)
$desnivel = Fmt ($mj.paginas.'6'.pisoAltura_m - $mj.paginas.'1'.pisoAltura_m)
$note = "Grade de 10 m. Estacionamentos, pátio, grades, escada externa e rampa foram desenhados à mão (sem planta): posição aproximada, cerca de 0,5 m de precisão. Alturas de piso lidas do modelo do site (o Bloco A está $desnivel m abaixo dos demais no GLB — confirmar se é desnível real do terreno). O andar 1 do modelo é só o pé-direito duplo do térreo e não tem planta própria. Superior do A com escala corrigida: no modelo atual ele está ~35% maior e avança sobre o Bloco B. Bloco D girado 180° em relação ao modelo do site, com a escada compartilhada sobre a escada do C; os corredores que passam do C para o D são contínuos (sem parede na junção)."
$g.DrawString($note, (New-Object Drawing.Font 'Segoe UI', 10), (New-Object Drawing.SolidBrush $muted), (New-Object Drawing.RectangleF $pad, ($ly + 6), ($W - 2 * $pad), 64))
$bmp.Save((Join-Path $OutDir 'Montagem-implantacao.png'), [Drawing.Imaging.ImageFormat]::Png)
if ($site) {
  $sx = @($site.areas | ForEach-Object { $_.poly } | ForEach-Object { [double]$_[0] }); $sz = @($site.areas | ForEach-Object { $_.poly } | ForEach-Object { [double]$_[1] })
  $wx0 = ($sx | Measure-Object -Minimum).Minimum - 9; $wx1 = ($sx | Measure-Object -Maximum).Maximum + 7
  $wz0 = ($sz | Measure-Object -Minimum).Minimum - 9; $wz1 = ($sz | Measure-Object -Maximum).Maximum + 8
  $src = New-Object Drawing.Rectangle ([int]($pad + ($wx0 - $minX) * $sc)), ([int]($top + ($wz0 - $minZ) * $sc)), ([int](($wx1 - $wx0) * $sc)), ([int](($wz1 - $wz0) * $sc))
  $det = New-Object Drawing.Bitmap ([int]($src.Width * 1.6)), ([int]($src.Height * 1.6))
  $gd = [Drawing.Graphics]::FromImage($det); $gd.InterpolationMode = 'HighQualityBicubic'
  $gd.DrawImage($bmp, (New-Object Drawing.Rectangle 0, 0, $det.Width, $det.Height), $src, [Drawing.GraphicsUnit]::Pixel)
  $det.Save((Join-Path $OutDir 'Implantacao-detalhe.png'), [Drawing.Imaging.ImageFormat]::Png)
  $gd.Dispose(); $det.Dispose()
}
$g.Dispose(); $bmp.Dispose()
Write-Output "Montagem-implantacao.png  ${W}x$H"

# ---------- vista explodida (uma pilha por bloco) ----------
$ang = -32 * [Math]::PI / 180; $ca = [Math]::Cos($ang); $sa = [Math]::Sin($ang)
$iso = 8.0; $squash = 0.52
$E1 = 20; $E2 = 40
$stacks = [ordered]@{ A = @('1', '2'); B = @('3'); C = @('4', '5'); D = @('6', '7') }
$labelW = 250

function Raw([double]$x, [double]$z, [double]$h) { @((($x * $ca - $z * $sa) * $iso), ((($x * $sa + $z * $ca) * $squash - $h) * $iso)) }
$cells = [ordered]@{}
foreach ($id in $stacks.Keys) {
  $pgT = $mj.paginas.($stacks[$id][0]); $bT = BoxWorld $pgT
  $cx = ($bT[0][0] + $bT[2][0]) / 2; $cz = ($bT[0][1] + $bT[2][1]) / 2
  $xs = @(); $ys = @()
  foreach ($k in $stacks[$id]) {
    $hD = $(if ($mj.paginas.$k.nivel -gt 0) { $E2 } else { 0 })
    foreach ($c in (BoxWorld $mj.paginas.$k)) { foreach ($hh in @($hD, ($hD - 1.2), $E1)) { $q = Raw ($c[0] - $cx) ($c[1] - $cz) $hh; $xs += $q[0]; $ys += $q[1] } }
  }
  $m = $xs | Measure-Object -Minimum -Maximum; $n = $ys | Measure-Object -Minimum -Maximum
  $cells[$id] = @{ cx = $cx; cz = $cz; x0 = $m.Minimum; x1 = $m.Maximum; y0 = $n.Minimum; y1 = $n.Maximum }
}
$rowsDef = @(@('A', 'B'), @('C', 'D'))
$titleH = 70
$cellW = @{}; foreach ($id in $cells.Keys) { $cellW[$id] = ($cells[$id].x1 - $cells[$id].x0) + $labelW }
$rowH = @(); $W = 0
foreach ($r in $rowsDef) {
  $rowH += ($r | ForEach-Object { $cells[$_].y1 - $cells[$_].y0 } | Measure-Object -Maximum).Maximum
  $W = [Math]::Max($W, $pad + ($r | ForEach-Object { $cellW[$_] + $pad } | Measure-Object -Sum).Sum)
}
$W = [int]$W; $H = [int](110 + 30 + ($rowH | Measure-Object -Sum).Sum + ($titleH + 20) * $rowsDef.Count + 170)
$placement = @{}; $rowY = 110 + 30 + $titleH
for ($ri = 0; $ri -lt $rowsDef.Count; $ri++) {
  $cx0 = $pad
  foreach ($id in $rowsDef[$ri]) { $placement[$id] = @($cx0, $rowY, $rowH[$ri]); $cx0 += $cellW[$id] + $pad }
  $rowY += $rowH[$ri] + $titleH + 20
}
$cv = NewCanvas $W $H; $bmp = $cv[0]; $g = $cv[1]
Header $g $W 'Como as peças se empilham — vista explodida por bloco' "Cada bloco desmontado na vertical: térreo embaixo, `"andar 1`" do modelo (pé-direito duplo, sem planta) e pavimento superior`nalturas afastadas só para visualização · rótulos mostram a altura real de cada piso no modelo do site"

$fTag = New-Object Drawing.Font 'Segoe UI Semibold', 12
$fTag2 = New-Object Drawing.Font 'Segoe UI', 10
foreach ($id in $cells.Keys) {
  $cell = $cells[$id]; $col = $blockColor[$id]
  $curX = $placement[$id][0]; $cellTop = $placement[$id][1]; $maxCellH = $placement[$id][2]
  $offX = $curX - $cell.x0; $offY = $cellTop + ($maxCellH - ($cell.y1 - $cell.y0)) - $cell.y0
  $pt = { param([double]$x, [double]$z, [double]$h) $q = Raw ($x - $cell.cx) ($z - $cell.cz) $h; New-Object Drawing.PointF ([float]($q[0] + $offX)), ([float]($q[1] + $offY)) }.GetNewClosure()

  Badge $g $id ($curX + 20) ($cellTop - 40) 20
  $g.DrawString("Bloco $id", (New-Object Drawing.Font 'Segoe UI Semibold', 16), (New-Object Drawing.SolidBrush $navy), [float]($curX + 48), [float]($cellTop - 54))

  $kT = $stacks[$id][0]; $pgT = $mj.paginas.$kT
  $kS = $(if ($stacks[$id].Count -gt 1) { $stacks[$id][1] } else { $null })
  $layers = @()

  # térreo
  $bx = BoxWorld $pgT
  $topP = [Drawing.PointF[]]($bx | ForEach-Object { & $pt $_[0] $_[1] 0 })
  $botP = [Drawing.PointF[]]($bx | ForEach-Object { & $pt $_[0] $_[1] -1.2 })
  $edge = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(178, 188, 202))
  for ($i = 0; $i -lt 4; $i++) { $j = ($i + 1) % 4; $g.FillPolygon($edge, [Drawing.PointF[]]@($topP[$i], $topP[$j], $botP[$j], $botP[$i])) }
  $g.FillPolygon((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(250, 251, 253))), $topP)
  $projT = { param($wp, $pg) & $pt $wp[0] $wp[1] 0 }.GetNewClosure()
  DrawPlan $g $kT $projT $attrFull
  $g.DrawPolygon((New-Object Drawing.Pen $col, 2.5), $topP)
  $layers += , @($topP, "$(PavName $pgT)", ("piso " + (Fmt $pgT.pisoAltura_m) + " m" + $(if ($pgT.ajuste.nota) { " · " + $pgT.ajuste.nota } else { "" })), $false)

  if ($kS) {
    # paredes do térreo subindo até o andar 1 (pé-direito duplo)
    $penW = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(140, 120, 132, 150)), 1.4; $penW.DashStyle = 'Dot'
    foreach ($c in $bx) { $a = & $pt $c[0] $c[1] 0; $b = & $pt $c[0] $c[1] $E1; $g.DrawLine($penW, $a, $b) }
    $ghost = [Drawing.PointF[]]($bx | ForEach-Object { & $pt $_[0] $_[1] $E1 })
    $g.FillPolygon((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(40, 120, 132, 150))), $ghost)
    $penG = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(150, 120, 132, 150)), 1.6; $penG.DashStyle = 'Dash'
    $g.DrawPolygon($penG, $ghost)
    $layers += , @($ghost, 'Andar 1 do modelo', ("pé-direito duplo · " + (Fmt ($pgT.pisoAltura_m + 2.56)) + " m · sem planta"), $true)

    # superior + prumada
    $pgS = $mj.paginas.$kS; $bs = BoxWorld $pgS
    $penP = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(170, $col)), 1.6; $penP.DashStyle = 'Dash'
    foreach ($c in $bs) { $a = & $pt $c[0] $c[1] 0; $b = & $pt $c[0] $c[1] $E2; $g.DrawLine($penP, $a, $b) }
    $foot = [Drawing.PointF[]]($bs | ForEach-Object { & $pt $_[0] $_[1] 0 })
    $g.DrawPolygon($penP, $foot)
    $topS = [Drawing.PointF[]]($bs | ForEach-Object { & $pt $_[0] $_[1] $E2 })
    $botS = [Drawing.PointF[]]($bs | ForEach-Object { & $pt $_[0] $_[1] ($E2 - 1.2) })
    for ($i = 0; $i -lt 4; $i++) { $j = ($i + 1) % 4; $g.FillPolygon($edge, [Drawing.PointF[]]@($topS[$i], $topS[$j], $botS[$j], $botS[$i])) }
    $g.FillPolygon((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(250, 251, 253))), $topS)
    $projS = { param($wp, $pg) & $pt $wp[0] $wp[1] $E2 }.GetNewClosure()
    DrawPlan $g $kS $projS $attrFull
    $g.DrawPolygon((New-Object Drawing.Pen $col, 2.5), $topS)
    $subS = "piso " + (Fmt $pgS.pisoAltura_m) + " m" + $(if ($pgS.ajuste.nota) { " · " + $pgS.ajuste.nota } else { "" })
    $layers += , @($topS, 'Superior', $subS, $false)
  }

  # rótulos à direita de cada camada
  $labX = $curX + ($cell.x1 - $cell.x0) + 24
  foreach ($L in $layers) {
    $right = $L[0] | Sort-Object X -Descending | Select-Object -First 1
    $ty = $right.Y
    $bgr = New-Object Drawing.RectangleF ([float]$labX), ([float]($ty - 21)), ([float]($labelW - 34)), 42
    $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(240, 255, 255, 255))), $bgr)
    $barCol = $(if ($L[3]) { [Drawing.Color]::FromArgb(150, 160, 175) } else { $col })
    $g.FillRectangle((New-Object Drawing.SolidBrush $barCol), $bgr.X, $bgr.Y, 5, $bgr.Height)
    $g.DrawString($L[1], $fTag, (New-Object Drawing.SolidBrush $(if ($L[3]) { $muted } else { $navy })), $bgr.X + 10, $bgr.Y + 1)
    $g.DrawString($L[2], $fTag2, (New-Object Drawing.SolidBrush $muted), $bgr.X + 10, $bgr.Y + 21)
    $lp = New-Object Drawing.Pen $barCol, 1.2
    $g.DrawLine($lp, [float]($right.X + 4), [float]$right.Y, [float]$labX, [float]$ty)
  }
}

$ly = Legend $g $pad ($H - 150) ($W - 2 * $pad)
$desnivel = Fmt ($mj.paginas.'6'.pisoAltura_m - $mj.paginas.'1'.pisoAltura_m)
$expl = "Como ler: cada bandeja é uma planta interpretada, encaixada nas paredes do modelo do site. Pontilhado cinza = paredes do térreo subindo pelo pé-direito duplo (o `"andar 1`" do Sweet Home 3D). Tracejado colorido = prumada: o superior fica exatamente sobre essa área do térreo. No GLB o Bloco A está $desnivel m abaixo de B, C e D (a confirmar se é desnível do terreno). O superior do A foi reescalado pelas paredes do térreo: no modelo atual ele está ~35% maior e avança sobre o Bloco B. O Bloco D está girado 180° em relação ao modelo do site, com a escada compartilhada sobre a escada do C."
$g.DrawString($expl, (New-Object Drawing.Font 'Segoe UI', 10), (New-Object Drawing.SolidBrush $muted), (New-Object Drawing.RectangleF $pad, ($ly + 4), ($W - 2 * $pad), 64))
$bmp.Save((Join-Path $OutDir 'Montagem-explodida.png'), [Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "Montagem-explodida.png  ${W}x$H"
foreach ($im in $imgs.Values) { $im.Dispose() }
