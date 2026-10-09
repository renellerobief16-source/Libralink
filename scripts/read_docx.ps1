Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('LibraLink-mementomori (1).docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$clean = [System.Text.RegularExpressions.Regex]::Replace($xml, '<w:p[ >]', "`n<p>")
$clean = [System.Text.RegularExpressions.Regex]::Replace($clean, '<[^>]+>', '')
$clean = [System.Net.WebUtility]::HtmlDecode($clean)
$lines = $clean -split "`n" | Where-Object { $_.Trim().Length -gt 0 }

for ($i = 660; $i -lt 686; $i++) {
    $txt = [System.Text.RegularExpressions.Regex]::Replace($lines[$i], 'w14:[^>]*>|w:[^>]*>', '').Trim()
    if ($txt.Length -gt 0) {
        Write-Output "[$i] $txt"
    }
}
