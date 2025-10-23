<?php
// m3u.php — crée OM-STREAM-TV.m3u8 et OM-STREAM-TV.m3u 
declare(strict_types=1);
const OUTPUT_PATH_M3U8 = __DIR__ . '/OM-STREAM-TV.m3u8';
const OUTPUT_PATH_M3U  = __DIR__ . '/OM-STREAM-TV.m3u';
const CHANNEL_NAME = 'OM STREAM TV';
const TVG_ID       = 'OM STREAM TV';
const TVG_NAME     = 'OM STREAM TV';
const GROUP_TITLE  = 'IPTV';

// Normalise CRLF pour compatibilité
function nl_crlf(string $s): string {
  return str_replace(["\r\n", "\n", "\r"], "\r\n", $s);
}

header('Content-Type: text/html; charset=utf-8');

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https://' : 'http://';
$base   = $scheme . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['PHP_SELF']), '/');

$done = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['url'])) {
  $url = trim($_POST['stream_url'] ?? ($_GET['url'] ?? ''));

  if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    $error = "URL invalide.";
  } else {
    // Flux proxifié (proxy.php gère UA, referrer, CORS, réécriture HLS)
    $proxied = $base . '/proxy.php?url=' . urlencode($url);

    // Playlist M3U8 (master léger pointant sur un unique variant)
    $m3u8 = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      sprintf('#EXT-X-STREAM-INF:BANDWIDTH=3000000,NAME="%s"', CHANNEL_NAME),
      $proxied
    ];
    $content = nl_crlf(implode("\n", $m3u8)) . "\r\n";

    // Playlist M3U classique (même flux, format plus simple)
    $m3u = [
      '#EXTM3U',
      sprintf('#EXTINF:-1 tvg-id="%s" tvg-name="%s" group-title="%s",%s', TVG_ID, TVG_NAME, GROUP_TITLE, CHANNEL_NAME),
      $proxied
    ];
    $content_m3u = nl_crlf(implode("\n", $m3u)) . "\r\n";

    // Vérifie que le dossier est accessible
    $dir = dirname(OUTPUT_PATH_M3U8);
    if (!is_dir($dir)) {
      $error = "Le dossier de sortie n’existe pas : " . htmlspecialchars($dir);
    } elseif (!is_writable($dir)) {
      $error = "Le dossier n’est pas accessible en écriture par PHP : " . htmlspecialchars($dir);
    } else {
      $ok1 = @file_put_contents(OUTPUT_PATH_M3U8, $content, LOCK_EX);
      $ok2 = @file_put_contents(OUTPUT_PATH_M3U,  $content_m3u, LOCK_EX);
      if ($ok1 === false || $ok2 === false) {
        http_response_code(500);
        $error = "❌ Impossible d’écrire les fichiers M3U/M3U8. Vérifie les permissions (chown/chmod) et le chemin réel OVH.";
      } else {
        $done = true;
      }
    }
  }
}
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Générateur FLUX M3U8</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body {
    font-family: system-ui,Segoe UI,Roboto,Arial,sans-serif;
    background: #0a0a0a;
    color: #eee;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
    padding: 24px;
  }
  form {
    background: #151515;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 24px 28px;
    max-width: 600px;
    width: 100%;
    text-align: center;
  }
  input[type=text] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #333;
    border-radius: 10px;
    background: #0f0f0f;
    color: #eee;
    margin-top: 6px;
  }
  button {
    display: block;
    margin: 20px auto 0;
    padding: 12px 28px;
    border: none;
    border-radius: 10px;
    background: #27c93f;
    color: #000;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  button:hover { transform: scale(1.05); background: #2df84a; }
  .msg { margin-top: 20px; color: #7cff7c; }
  .err { margin-top: 20px; color: #ff7c7c; }
  a { color: #27c93f; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>

<form method="post">
  <h2>Générer le fichier M3U8</h2>
  <label for="stream_url">URL</label>
  <input type="text" id="stream_url" name="stream_url" value="" required placeholder="https://exemple.tld/flux/index.m3u8">
  <button type="submit">VALIDER</button>

  <?php if ($done): ?>
    <div class="msg">
      ✅ Fichiers créés avec succès<br>
    </div>
  <?php elseif (!empty($error)): ?>
    <div class="err"><?php echo $error; ?></div>
  <?php endif; ?>
</form>

<!-- Bouton Retour -->
<div style="text-align: center; margin-top: 20px;">
  <a href="index.html"
     style="display:inline-block;padding:10px 20px;background-color:green;color:white;border-radius:5px;font-weight:bold;transition:all 0.2s ease;"
     onmouseover="this.style.backgroundColor='#28b528'"
     onmouseout="this.style.backgroundColor='green'">← Retour</a>
</div>

<script>
// Récupérer l'IP du visiteur (ipify)
async function getVisitorIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || null;
  } catch (err) {
    console.error('Erreur récupération IP visiteur :', err);
    return null;
  }
}

// Récupérer l'IP autorisée
async function getAuthorizedIp() {
  try {
    const res = await fetch('/ip.php', { cache: 'no-store' });
    const data = await res.json();
    return data.ip || null;
  } catch (err) {
    console.error('Erreur récupération IP autorisée :', err);
    return null;
  }
}

async function checkIpAndRedirect() {
  const [visitorIp, authorizedIp] = await Promise.all([getVisitorIp(), getAuthorizedIp()]);
  if (!visitorIp || !authorizedIp) return;
  if (visitorIp !== authorizedIp) {
    console.clear();
    document.body.innerHTML =
      '<img src="/img/fuck.gif" style="width:100vw;height:100vh;object-fit:contain;" alt="">';
  }
}

// Anti-F12
document.addEventListener('keydown', (e) => {
  if (e.keyCode === 123) e.preventDefault();
});

// Lance la vérif IP quand la page est prête
document.addEventListener('DOMContentLoaded', () => {
  checkIpAndRedirect();
});
</script>

</body>
</html>
