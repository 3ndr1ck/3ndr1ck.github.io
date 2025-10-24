<?php
// player.php — lecteur simple pour un flux HLS (.m3u8)

// URL du flux (fixe comme demandé)
$HLS_URL = "http://vpsfyhi.cluster029.hosting.ovh.net/OM-STREAM-TV_latest.m3u8";

// Optionnel : autoriser l'override via ?src=...
if (!empty($_GET['src'])) {
  $try = filter_var($_GET['src'], FILTER_VALIDATE_URL);
  if ($try) { $HLS_URL = $try; }
}
?>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IPTV Player</title>
  <style>
    html,body{height:100%;margin:0;background:#0b0b0b;color:#eee;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    .wrap{max-width:960px;margin:0 auto;padding:16px;}
    .card{background:#111;border:1px solid #222;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);padding:12px;}
    .video-shell{position:relative;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;}
    video{width:100%;height:100%;display:block;background:#000;}
    .hint{opacity:.7;font-size:.9rem;margin-top:8px}
  </style>
  <!-- hls.js depuis CDN (pour Chrome/Edge/Firefox). Safari iOS lit nativement. -->
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>
</head>
<body>
  <div class="wrap">
    <h1>IPTV Player</h1>
    <div class="card">
      <div class="video-shell">
        <video id="video" controls playsinline muted autoplay></video>
      </div>
      <p class="hint">
        Lecture automatique activée (muted). Si la lecture ne démarre pas, clique sur ▶.
      </p>
    </div>
  </div>

  <script>
    (function () {
      const src = <?= json_encode($HLS_URL) ?>;
      const video = document.getElementById('video');

      // Quelques paramètres utiles
      video.setAttribute('preload', 'auto');   // précharge
      video.setAttribute('controls', 'true');  // contrôles visibles
      video.setAttribute('muted', 'true');     // requis pour l’autoplay sur la plupart des navigateurs

      // Si le navigateur supporte nativement HLS (Safari/iOS)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.play().catch(() => {/* ignorer l’erreur d’autoplay */});
      } else if (window.Hls && Hls.isSupported()) {
        // Pour Chrome/Edge/Firefox : utiliser hls.js
        const hls = new Hls({
          // Réglages fiables par défaut
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          video.play().catch(() => {/* ignorer l’erreur d’autoplay */});
        });

        // Logs d’erreurs basiques
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
          console.warn('[HLS ERROR]', data);
        });
      } else {
        // Ultime fallback : on tente quand même (certains navigateurs Android)
        video.src = src;
        video.play().catch(() => {/* ignorer */});
      }
    })();
  </script>
</body>
</html>
