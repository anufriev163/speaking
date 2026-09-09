Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )

    $src = [System.Drawing.Image]::FromFile($InputPath)
    $dest = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $g.DrawImage($src, 0, 0, $Width, $Height)

    $src.Dispose()
    $g.Dispose()

    $dest.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Created: $OutputPath ($Width x $Height)"
}

$root = "$PSScriptRoot/.."
Resize-Image "$root/assets/icon.png" "$root/assets/icon-512.png" 512 512
Resize-Image "$root/assets/icon.png" "$root/assets/icon-1024.png" 1024 1024
# Also update assets/icon.png to 512x512 as electron-builder uses assets/icon.png by default
Resize-Image "$root/assets/icon.png" "$root/assets/icon_new.png" 512 512
Move-Item -Force "$root/assets/icon_new.png" "$root/assets/icon.png"
Write-Host "Updated assets/icon.png to 512x512 successfully."
