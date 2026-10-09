Add-Type -AssemblyName System.Drawing

function Render-Straight-Mockup {
    param(
        [string]$ScreenshotPath,
        [string]$OutputPath
    )

    $canvasWidth = 1920
    $canvasHeight = 1080

    $bmp = New-Object System.Drawing.Bitmap $canvasWidth, $canvasHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Background: Dark Navy Radial/Linear Gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point 0, 0),
        (New-Object System.Drawing.Point $canvasWidth, $canvasHeight),
        [System.Drawing.ColorTranslator]::FromHtml("#070e1b"),
        [System.Drawing.ColorTranslator]::FromHtml("#0b192c")
    )
    $g.FillRectangle($bgBrush, 0, 0, $canvasWidth, $canvasHeight)

    # Ambient radial highlight behind laptop (around x=1350, y=520)
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddEllipse(800, 100, 1100, 900)
    $pathBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
    $pathBrush.CenterColor = [System.Drawing.Color]::FromArgb(45, 2, 132, 199)
    $pathBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 7, 14, 27))
    $g.FillPath($pathBrush, $glowPath)

    # Helper function to create rounded rectangle path
    function Get-RoundedRectPath($rect, $radius) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
        $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
        $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        return $path
    }

    # 2. Dimensions for STRAIGHT Laptop Monitor
    $lidX = 810
    $lidY = 130
    $lidW = 1020
    $lidH = 710
    $lidRect = New-Object System.Drawing.Rectangle $lidX, $lidY, $lidW, $lidH
    $lidRadius = 20

    # Large realistic drop shadow behind monitor and base
    $shadowRect = New-Object System.Drawing.Rectangle ($lidX - 30), ($lidY + 20), ($lidW + 60), ($lidH + 60)
    $shadowPath = Get-RoundedRectPath $shadowRect 30
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
    $g.FillPath($shadowBrush, $shadowPath)

    # 3. Outer Monitor Lid / Chassis (Dark titanium aluminum)
    $lidPath = Get-RoundedRectPath $lidRect $lidRadius
    $lidBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point $lidX, $lidY),
        (New-Object System.Drawing.Point ($lidX + $lidW), ($lidY + $lidH)),
        [System.Drawing.ColorTranslator]::FromHtml("#1e293b"),
        [System.Drawing.ColorTranslator]::FromHtml("#0b1320")
    )
    $g.FillPath($lidBrush, $lidPath)

    # Lid border highlight
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 255, 255, 255), 2.0)
    $g.DrawPath($borderPen, $lidPath)

    # 4. Inner Screen Display
    $screenMargin = 16
    $screenX = $lidX + $screenMargin
    $screenY = $lidY + $screenMargin
    $screenW = $lidW - ($screenMargin * 2)
    $screenH = $lidH - ($screenMargin * 2)
    $screenRect = New-Object System.Drawing.Rectangle $screenX, $screenY, $screenW, $screenH
    $screenRadius = 10
    $screenPath = Get-RoundedRectPath $screenRect $screenRadius

    # Clip to screen area and draw screenshot straight
    $g.SetClip($screenPath)

    $screenImg = [System.Drawing.Image]::FromFile($ScreenshotPath)
    
    # Calculate aspect fill / fit
    # We draw the screenshot to completely fill the screen cleanly
    $g.DrawImage($screenImg, $screenRect)

    # Subtle modern glass glare reflection across screen
    $glareBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point $screenX, $screenY),
        (New-Object System.Drawing.Point ($screenX + $screenW), ($screenY + $screenH)),
        [System.Drawing.Color]::FromArgb(25, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(0, 255, 255, 255)
    )
    $g.FillPath($glareBrush, $screenPath)

    # Reset clip
    $g.ResetClip()

    # Screen border stroke
    $screenStroke = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 0, 0, 0), 1.5)
    $g.DrawPath($screenStroke, $screenPath)

    # 5. Top Center Camera Notch
    $notchW = 100
    $notchH = 14
    $notchX = $lidX + ($lidW / 2) - ($notchW / 2)
    $notchY = $screenY
    $notchRect = New-Object System.Drawing.Rectangle $notchX, $notchY, $notchW, $notchH
    $notchPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $notchPath.AddArc($notchX, $notchY + $notchH - 8, 8, 8, 90, 90)
    $notchPath.AddArc($notchX + $notchW - 8, $notchY + $notchH - 8, 8, 8, 0, 90)
    $notchPath.CloseFigure()
    $notchBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0b1320"))
    $g.FillRectangle($notchBrush, $notchX, $notchY, $notchW, $notchH)
    
    # Camera dot
    $camBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1e3a5f"))
    $g.FillEllipse($camBrush, ($lidX + ($lidW / 2) - 3), ($screenY + 4), 6, 6)

    # 6. Sleek Straight Laptop Base / Keyboard Deck underneath
    $baseMargin = 40
    $baseX = $lidX - $baseMargin
    $baseY = $lidY + $lidH
    $baseW = $lidW + ($baseMargin * 2)
    $baseH = 20
    $baseRect = New-Object System.Drawing.Rectangle $baseX, $baseY, $baseW, $baseH
    $baseRadius = 10
    $basePath = Get-RoundedRectPath $baseRect $baseRadius

    $baseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point $baseX, $baseY),
        (New-Object System.Drawing.Point $baseX, ($baseY + $baseH)),
        [System.Drawing.ColorTranslator]::FromHtml("#cbd5e1"),
        [System.Drawing.ColorTranslator]::FromHtml("#64748b")
    )
    $g.FillPath($baseBrush, $basePath)
    
    # Base top highlight edge
    $baseHighlight = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 255, 255, 255), 1.5)
    $g.DrawLine($baseHighlight, $baseX, $baseY, ($baseX + $baseW), $baseY)

    # Center thumb indent notch on the base
    $indentW = 90
    $indentH = 5
    $indentX = $baseX + ($baseW / 2) - ($indentW / 2)
    $indentY = $baseY
    $indentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#475569"))
    $g.FillRectangle($indentBrush, $indentX, $indentY, $indentW, $indentH)

    # Ambient ground shadow beneath the base
    $groundShadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110, 0, 0, 0))
    $groundShadowRect = New-Object System.Drawing.Rectangle ($baseX + 20), ($baseY + $baseH - 4), ($baseW - 40), 16
    $g.FillEllipse($groundShadowBrush, $groundShadowRect)

    # Clean up and Save
    $screenImg.Dispose()
    $g.Dispose()

    # Save as High Quality JPEG
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 96L)

    $bmp.Save($OutputPath, $encoder, $encoderParams)
    $bmp.Dispose()
    Write-Output "Successfully generated straight mockup: $OutputPath"
}

# Render Scene 1 (Top Details - Straight)
Render-Straight-Mockup `
    -ScreenshotPath "C:\Users\Renel\.gemini\antigravity-ide\brain\b6ab7f67-dfc5-40d4-bb5a-3aa05dd04812\.user_uploaded\media_1791340262287.png" `
    -OutputPath "c:\xampp\htdocs\libralinkk\public\libralink_checkout_step1_details.jpg"

# Render Scene 2 (Bottom Submit Action - Straight)
Render-Straight-Mockup `
    -ScreenshotPath "C:\Users\Renel\.gemini\antigravity-ide\brain\b6ab7f67-dfc5-40d4-bb5a-3aa05dd04812\.user_uploaded\media_1791340288293.png" `
    -OutputPath "c:\xampp\htdocs\libralinkk\public\libralink_checkout_step2_submit.jpg"

# Sync to dist if exists
if (Test-Path "c:\xampp\htdocs\libralinkk\dist") {
    Copy-Item "c:\xampp\htdocs\libralinkk\public\libralink_checkout_step1_details.jpg" "c:\xampp\htdocs\libralinkk\dist\" -Force
    Copy-Item "c:\xampp\htdocs\libralinkk\public\libralink_checkout_step2_submit.jpg" "c:\xampp\htdocs\libralinkk\dist\" -Force
}
