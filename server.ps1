$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Server listening at $prefix"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        
        $localPath = Join-Path $PSScriptRoot $urlPath.TrimStart('/')

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            if ($localPath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($localPath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($localPath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            
            $response.ContentLength64 = [long]$bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = [long]$buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    } catch {
        Write-Host "Request error: $_"
    }
}
