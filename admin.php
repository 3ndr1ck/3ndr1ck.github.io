<?php
// ---------------------------------------------
// CONFIG
// ---------------------------------------------
$jsonFile     = '/home/vpsfyhi/json.json';
$passwordFile = '/home/vpsfyhi/.password';
$message      = '';

// Liste d'équipes
include 'teams.php';

// --- LISTE DES CHAÎNES PRÉDÉFINIES ---
include 'tv.php';

// ---------------------------------------------
// OUTILS
// ---------------------------------------------
function load_json_array(string $path): array {
    if (!file_exists($path)) return [];
    $raw = file_get_contents($path);
    if ($raw === false) return [];
    $data = json_decode($raw, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($data)) ? $data : [];
}

function save_json_array(string $path, array $data): bool {
    return file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false;
}

// ---------------------------------------------
// TRAITEMENT
// ---------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $msgs         = [];
    $jsonTouched  = false;

    $jsonData = load_json_array($jsonFile);
    if (empty($jsonData) && !file_exists($jsonFile)) {
        $msgs[] = "ℹ️ Fichier JSON introuvable, il sera créé : $jsonFile";
    } elseif (!is_array($jsonData)) {
        $msgs[] = "⚠️ Erreur de lecture JSON (format invalide).";
        $jsonData = [];
    }

    // 1) Mot de passe
    $password = trim($_POST['password'] ?? '');
    if ($password !== '') {
        if (file_put_contents($passwordFile, password_hash($password, PASSWORD_DEFAULT), LOCK_EX)) {
            $msgs[] = "✅ Mot de passe mis à jour.";
        } else {
            $msgs[] = "⚠️ Erreur lors de l'écriture du mot de passe.";
        }
    }

    // 2) postx -> json.json
    $postX = trim($_POST['postx'] ?? '');
    if ($postX !== '') {
        $jsonData['post'] = $postX;
        $jsonTouched = true;
        $msgs[] = "✅ postx mis à jour dans json.json";
    }

    // 3) Logos équipes
    $domicile  = trim($_POST['domicile']  ?? '');
    $exterieur = trim($_POST['exterieur'] ?? '');

    if ($domicile !== '') {
        $jsonData['domicile'] = "https://om-sup.ovh/team/" . rawurlencode($domicile) . ".png";
        $jsonTouched = true;
        $msgs[] = "✅ domicile mis à jour";
    }
    if ($exterieur !== '') {
        $jsonData['exterieur'] = "https://om-sup.ovh/team/" . rawurlencode($exterieur) . ".png";
        $jsonTouched = true;
        $msgs[] = "✅ exterieur mis à jour";
    }

    if ($domicile !== '' && $exterieur !== '') {
        $DD         = trim($_POST['DD']         ?? '08');
        $MM         = trim($_POST['MM']         ?? '05');
        $YYYY       = trim($_POST['YYYY']       ?? '1981');
        $hh         = trim($_POST['hh']         ?? '14');
        $mm         = trim($_POST['mm']         ?? '15');
        $tournament = trim($_POST['tournament'] ?? '');
        $round      = trim($_POST['round']      ?? '');
        $channel    = trim($_POST['channel']    ?? '');
        $height     = trim($_POST['height']     ?? '315');

        $readQuery = [
            'team_home' => $domicile, 'team_away' => $exterieur, 'tournament'=> $tournament,
            'round' => $round, 'DD' => $DD, 'MM' => $MM, 'YYYY' => $YYYY,
            'channel' => $channel, 'hh' => $hh, 'mm' => $mm, 'height' => $height,
        ];
        $innerReadUrl = 'https://om-sup.ovh/prez/?' . http_build_query($readQuery);
        $jsonData['match-image'] = $innerReadUrl;
        $jsonData['playerBG']    = $innerReadUrl;
        $jsonTouched = true;
        $msgs[] = "✅ match-image mis à jour";
    }

    // 4) event_date
    $dateInput = trim($_POST['date_debut_stream'] ?? '');
    if ($dateInput !== '') {
        $dt = DateTime::createFromFormat('Y-m-d\TH:i', $dateInput);
        if ($dt) {
            $jsonData['event_date'] = [
                'day' => (int)$dt->format('d'), 'month' => (int)$dt->format('m'),
                'year' => (int)$dt->format('Y'), 'hour' => (int)$dt->format('H'),
                'minute' => (int)$dt->format('i'), 'second' => 0
            ];
            $jsonTouched = true;
            $msgs[] = "✅ event_date mis à jour";
        }
    }

    // 5) Renommage fichier HTML local
    $keysToCheck = ['stream_url','domicile','exterieur','date_debut_stream','postx'];
    $__noInput = true;
    foreach ($keysToCheck as $__k) {
        if (isset($_POST[$__k]) && trim((string)$_POST[$__k]) !== '') { $__noInput = false; break; }
    }

    if (!$__noInput) {
        $baseDir = __DIR__;
        $candidates = glob($baseDir . '/OM-STREAM-TV_*.html');
        if (!$candidates) $candidates = array_values(array_filter(glob($baseDir . '/OM-STREAM-TV_*'), fn($p) => !is_dir($p)));

        if ($candidates) {
            usort($candidates, fn($a,$b) => filemtime($b) <=> filemtime($a));
            $oldPath = $candidates[0];
            $suffix = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 10);
            $newName = 'OM-STREAM-TV_' . $suffix . '.html';
            if (@rename($oldPath, $baseDir . '/' . $newName)) {
                $jsonData['streamUrl'] = $newName;
                $jsonTouched = true;
            }
        }
    }

    // 7) Génération M3U/M3U8
    $stream_url = trim($_POST['stream_url'] ?? '');
    if ($stream_url !== '') {
        foreach (glob(__DIR__ . '/OM-STREAM-TV*.m3u*') as $old) { @unlink($old); }
        $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $proxied = $scheme . '://' . $host . '/proxy.php?url=' . urlencode($stream_url);

        $m3u8 = "#EXTM3U\r\n#EXT-X-VERSION:3\r\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,NAME=\"OM STREAM TV\"\r\n" . $proxied . "\r\n";
        $m3u  = "#EXTM3U\r\n#EXTINF:-1 tvg-id=\"OM STREAM TV\" group-title=\"IPTV\",OM STREAM TV\r\n" . $proxied . "\r\n";

        file_put_contents(__DIR__ . '/OM-STREAM-TV.m3u8', $m3u8, LOCK_EX);
        file_put_contents(__DIR__ . '/OM-STREAM-TV.m3u',  $m3u,  LOCK_EX);

        $suffix = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 10);
        @rename(__DIR__ . '/OM-STREAM-TV.m3u8', __DIR__ . '/OM-STREAM-TV_' . $suffix . '.m3u8');
        @rename(__DIR__ . '/OM-STREAM-TV.m3u',  __DIR__ . '/OM-STREAM-TV_' . $suffix . '.m3u');
        @copy(__DIR__ . '/OM-STREAM-TV_' . $suffix . '.m3u8', __DIR__ . '/OM-STREAM-TV_latest.m3u8');

        $jsonData['fluxUrl'] = 'OM-STREAM-TV_' . $suffix . '.m3u8';
        $jsonTouched = true;
        $msgs[] = "✅ FLUX MIS À JOUR";
    }

    if ($jsonTouched) save_json_array($jsonFile, $jsonData);
    $message = !empty($msgs) ? implode("<br>", $msgs) : "⚠️ Aucun champ rempli.";
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Injection JSON - OM</title>
<style>
    body { font-family: 'Arial', sans-serif; background: #001f3f; color: #fff; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 15px; box-shadow: 0 0 30px rgba(0,183,255,0.5); width: 100%; max-width: 500px; text-align: center; }
    h2 { color: #00b7ff; text-shadow: 0 0 15px #00b7ff; }
    .logo { width: 100px; margin-bottom: 20px; filter: drop-shadow(0 0 15px #00b7ff); }
    label { display: block; margin-top: 15px; font-weight: bold; text-align:left; }
    input[type=text], input[type=datetime-local], input[type=password], select { width: 100%; padding: 10px; margin-top: 5px; border-radius: 5px; border: none; background: rgba(255,255,255,0.1); color: #fff; box-sizing: border-box; }
    select option { color: #000; }
    button { margin-top: 30px; padding: 12px 25px; border: none; border-radius: 8px; background: #00b7ff; color: #001f3f; font-weight: bold; cursor: pointer; transition: 0.3s; width: 100%; }
    button:hover { background: #00a3e0; box-shadow: 0 0 20px rgba(0,183,255,0.9); }
    .msg { margin-top: 20px; padding: 10px; background: rgba(0, 183, 255, 0.2); border-left: 4px solid #00b7ff; border-radius: 5px; }
    .preview img { max-width: 80px; margin-top: 10px; filter: drop-shadow(0 0 5px #00b7ff); }
    .back-btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: green; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
</style>
<script>
function updateLogo(selectId, previewId){
  const v = document.getElementById(selectId).value;
  const box = document.getElementById(previewId);
  box.innerHTML = v ? `<img src="https://om-sup.ovh/team/${encodeURIComponent(v)}.png">` : '';
}
</script>
</head>
<body>
<div class="container">
    <img src="https://om-sup.ovh/team/OM.png" alt="Logo OM" class="logo">
    <h2>Injection JSON - OM STREAM TV</h2>
    <form method="post">
        <label>Date début stream :</label>
        <input type="datetime-local" name="date_debut_stream">

        <label>Logo domicile :</label>
        <select name="domicile" id="domicile" onchange="updateLogo('domicile','preview_domicile')">
            <option value="">-- Choisir --</option>
            <?php foreach ($teams as $team): ?>
                <option value="<?= htmlspecialchars($team) ?>"><?= htmlspecialchars($team) ?></option>
            <?php endforeach; ?>
        </select>
        <div class="preview" id="preview_domicile"></div>

        <label>Logo exterieur :</label>
        <select name="exterieur" id="exterieur" onchange="updateLogo('exterieur','preview_exterieur')">
            <option value="">-- Choisir --</option>
            <?php foreach ($teams as $team): ?>
                <option value="<?= htmlspecialchars($team) ?>"><?= htmlspecialchars($team) ?></option>
            <?php endforeach; ?>
        </select>
        <div class="preview" id="preview_exterieur"></div>

        <label>Mot de passe :</label>
        <input type="password" name="password" placeholder="Nouveau mot de passe">
        <label>Post X :</label>
        <input type="text" name="postx" placeholder="URL du post X" style="margin-top:10px;">

        <hr style="margin-top:20px; border: 0; border-top: 1px solid rgba(255,255,255,0.1);">

        <label>Chaîne auto :</label>
        <select onchange="document.getElementById('stream_url').value = this.value">
            <option value="">-- Sélectionner une chaîne --</option>
            <?php foreach ($channels_list as $name => $url): ?>
                <option value="<?= htmlspecialchars($url) ?>"><?= htmlspecialchars($name) ?></option>
            <?php endforeach; ?>
        </select>

        <label>URL du flux (manuel) :</label>
        <input type="text" name="stream_url" id="stream_url" placeholder="https://...">

        <button type="submit">Injection</button>
        <a href="index.html" class="back-btn">← Retour</a>
    </form>

    <?php if ($message): ?><div class="msg"><?= $message ?></div><?php endif; ?>
</div>
</body>
</html>