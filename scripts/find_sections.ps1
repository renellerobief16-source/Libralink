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

# Find chapters and sections
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i].Trim()
    if ($line -match "CHAPTER|Introduction|Background of the Study|Statement of the Problem|Objectives|Scope|Significance|SYSTEM OVERVIEW") {
        Write-Output "[$i] $line"
    }
}
