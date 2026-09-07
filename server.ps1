$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "================================================="
Write-Host "Servidor local iniciado!"
Write-Host "Acesse o CRM no link: http://localhost:$port/"
Write-Host "================================================="

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $path = $request.Url.LocalPath.TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    
    $fullPath = Join-Path $PWD $path
    
    if (Test-Path $fullPath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentLength64 = $content.Length
        
        if ($fullPath -match '\.html$') { $response.ContentType = 'text/html; charset=utf-8' }
        elseif ($fullPath -match '\.css$') { $response.ContentType = 'text/css; charset=utf-8' }
        elseif ($fullPath -match '\.js$') { $response.ContentType = 'application/javascript; charset=utf-8' }
        elseif ($fullPath -match '\.json$') { $response.ContentType = 'application/json; charset=utf-8' }
        elseif ($fullPath -match '\.png$') { $response.ContentType = 'image/png' }
        elseif ($fullPath -match '\.jpg$') { $response.ContentType = 'image/jpeg' }
        elseif ($fullPath -match '\.svg$') { $response.ContentType = 'image/svg+xml' }
        
        $response.OutputStream.Write($content, 0, $content.Length)
        Write-Host "[200] $path"
    } else {
        $response.StatusCode = 404
        Write-Host "[404] $path não encontrado"
    }
    $response.Close()
}
