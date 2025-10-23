<?php
// proxy.php — Proxy HLS complet (détection par contenu, réécriture + streaming)

ini_set('display_errors', 0);
ignore_user_abort(true);
set_time_limit(0);

$url   = $_GET['url'] ?? '';
$debug = isset($_GET['debug']);

if (!$url || !preg_match('#^https?://#i', $url)) {
  http_response_code(400);
  exit('Bad URL');
}

// Infos de base (pour Referer/Origin et racine-relatives)
$pu      = parse_url($url);
$base    = $pu['scheme'].'://'.$pu['host'].(isset($pu['port'])?':'.$pu['port']:'');
$ref     = $base.'/';
$path    = $pu['path'] ?? '';
$ext     = strtolower(pathinfo($path, PATHINFO_EXTENSION));

// --- 1) Première requête en mémoire (pour détecter playlist vs segment) ---
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS      => 5,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT        => 15,
  CURLOPT_ENCODING       => '',
  CURLOPT_HTTPHEADER     => [
    'Accept: */*',
    'User-Agent: Mozilla/5.0',
    'Referer: '.$ref,
    'Origin: '.$base,
    'Connection: keep-alive',
  ],
  CURLOPT_HEADER         => false,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
  CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
]);

$data   = curl_exec($ch);
$errno  = curl_errno($ch);
$err    = curl_error($ch);
$code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$ctype  = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($errno || $code >= 400 || $data === false) {
  if ($debug) {
    header('Content-Type: text/plain; charset=utf-8');
    echo "cURL error ($errno): $err\nHTTP: $code\nURL: $url\n";
  } else {
    http_response_code(502);
    echo 'Bad Gateway';
  }
  exit;
}

// --- 2) Playlist ? (détection par contenu) ---
$is_playlist = (stripos($data, '#EXTM3U') !== false);

// URL de base du proxy (ex: http://ton-domaine)
$selfBase = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://')
            . $_SERVER['HTTP_HOST']
            . rtrim(dirname($_SERVER['PHP_SELF']), '/');

if ($is_playlist) {
  // Réécriture :
  // a) URLs absolues -> proxy
  $rew = preg_replace_callback('#(https?://[^\s\'"]+)#i', function($m) use ($selfBase) {
    return $selfBase.'/proxy.php?url='.urlencode($m[1]);
  }, $data);

  // b) Lignes relatives (y compris racine-relatives commençant par /)
  $rew = preg_replace_callback('/^(?!#)([^\r\n]+)$/m', function($m) use ($url, $base, $selfBase) {
    $line = trim($m[1]);
    if ($line === '' || preg_match('#^(https?://|proxy\.php\?url=)#i', $line)) return $line;

    if ($line[0] === '/') {
      // cas: /hls/xxx.ts -> depuis la racine du host
      $abs = $base.$line;
    } else {
      // cas: segment.ts ou subdir/segment.ts -> relatif à la playlist
      $abs = rtrim(dirname($url), '/').'/'.$line;
    }
    return $selfBase.'/proxy.php?url='.urlencode($abs);
  }, $rew);

  header('Access-Control-Allow-Origin: *');
  header('Cache-Control: no-cache');
  header('Content-Type: application/vnd.apple.mpegurl');
  // Normaliser CRLF
  echo preg_replace("/(?<!\r)\n/", "\r\n", $rew);
  exit;
}

// --- 3) Pas une playlist => (probablement un segment .ts) => re-stream ---
$contentType = (str_contains(strtolower($ctype ?? ''), 'mp2t') || $ext === 'ts')
  ? 'video/mp2t'
  : ($ctype ?: 'application/octet-stream');

header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache');
header('Content-Type: '.$contentType);
header('X-Accel-Buffering: no');

// Désactive les buffers PHP
while (ob_get_level() > 0) { ob_end_flush(); }
ob_implicit_flush(true);

// Re-télécharge en mode streaming (WRITEFUNCTION)
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => false,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS      => 5,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT        => 0, // streaming
  CURLOPT_ENCODING       => '',
  CURLOPT_HTTPHEADER     => [
    'Accept: */*',
    'User-Agent: Mozilla/5.0',
    'Referer: '.$ref,
    'Origin: '.$base,
    'Connection: keep-alive',
  ],
  CURLOPT_HEADER         => false,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
  CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
  CURLOPT_WRITEFUNCTION  => function($ch, $chunk) {
    echo $chunk; flush(); return strlen($chunk);
  }
]);

$ok   = curl_exec($ch);
$errno= curl_errno($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$ok || $errno || $code >= 400) {
  if ($debug) {
    header('Content-Type: text/plain; charset=utf-8');
    echo "cURL error ($errno): $err\nHTTP: $code\nURL: $url\n";
  } else {
    http_response_code(502);
  }
  exit;
}
