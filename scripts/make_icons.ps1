Add-Type -AssemblyName System.Drawing

$inputPath = Join-Path $PSScriptRoot "..\public\logo.png"
$fullPath = [System.IO.Path]::GetFullPath($inputPath)

Write-Host "Reading $fullPath"
$img = [System.Drawing.Bitmap]::FromFile($fullPath)
$w = $img.Width
$h = $img.Height
Write-Host "Original image size: $w x $h"

# Find non-transparent bounding box
$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y += 2) {
    for ($x = 0; $x -lt $w; $x += 2) {
        $pixel = $img.GetPixel($x, $y)
        if ($pixel.A -gt 15) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Bounding box: X=[$minX, $maxX], Y=[$minY, $maxY]"
$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Host "Content Dimensions: $contentW x $contentH"

$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)

function GenerateSquareIcon {
    param(
        [string]$outputPath,
        [int]$size,
        [double]$paddingRatio = 0.08,  # Fraction of padding around the content
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent
    )

    $destBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Available box for content with padding
    $availSize = $size * (1.0 - (2 * $paddingRatio))
    $scale = [Math]::Min($availSize / $contentW, $availSize / $contentH)
    
    $drawW = [int]($contentW * $scale)
    $drawH = [int]($contentH * $scale)
    $destX = [int](($size - $drawW) / 2)
    $destY = [int](($size - $drawH) / 2)

    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $drawW, $drawH)
    $g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $g.Dispose()

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated $outputPath ($size x $size)"
}

$publicDir = Join-Path $PSScriptRoot "..\public"

# 1. Favicon (128x128, transparent, standard padding)
GenerateSquareIcon -outputPath (Join-Path $publicDir "favicon.png") -size 128 -paddingRatio 0.05

# 2. PWA 192x192 (transparent, clean)
GenerateSquareIcon -outputPath (Join-Path $publicDir "pwa-192x192.png") -size 192 -paddingRatio 0.06

# 3. PWA 512x512 (transparent, clean)
GenerateSquareIcon -outputPath (Join-Path $publicDir "pwa-512x512.png") -size 512 -paddingRatio 0.06

# 4. Apple Touch Icon 180x180 (with subtle dark background #0a0a0f so iOS doesn't make transparent pixels black or weird)
$tabeDark = [System.Drawing.ColorTranslator]::FromHtml("#0a0a0f")
GenerateSquareIcon -outputPath (Join-Path $publicDir "apple-touch-icon.png") -size 180 -paddingRatio 0.12 -bgColor $tabeDark

# 5. Maskable Icon 512x512
# Maskable icons in Android must have a background color (non-transparent)
# AND the icon must live strictly within the center safe zone (80% diameter circle = 40% radius = ~18-20% margin on all sides)
GenerateSquareIcon -outputPath (Join-Path $publicDir "pwa-maskable-512x512.png") -size 512 -paddingRatio 0.20 -bgColor $tabeDark

$img.Dispose()
Write-Host "All icons generated successfully!"
