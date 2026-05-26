$root = 'D:\github\50！\diet-h5\frontend'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), 3000)
$listener.Start()
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    if (-not $line) { $client.Close(); continue }
    $parts = $line.Split(' ')
    $path = '/'
    if ($parts.Length -ge 2) { $path = $parts[1] }
    while (($h = $reader.ReadLine()) -ne '') { if ($h -eq $null) { break } }
    if ($path -eq '/') { $path = '/index.html' }
    $safe = $path.Split('?')[0].TrimStart('/')
    $file = Join-Path $root $safe
    if (-not (Test-Path $file)) { $file = Join-Path $root 'index.html' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
    $ct = switch ($ext) { '.html' {'text/html; charset=utf-8'} '.js' {'text/javascript; charset=utf-8'} '.css' {'text/css; charset=utf-8'} '.png' {'image/png'} '.jpg' {'image/jpeg'} '.jpeg' {'image/jpeg'} default {'application/octet-stream'} }
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $hBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($hBytes,0,$hBytes.Length)
    $stream.Write($bytes,0,$bytes.Length)
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
