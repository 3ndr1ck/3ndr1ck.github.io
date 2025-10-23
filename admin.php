<?php
// Fichier JSON
$jsonFile = '/home/vpsfyhi/json.json'; 
// Fichier mot de passe
$passwordFile = '/home/vpsfyhi/.password';
$message = '';

// Fichier qui contient la liste complète des équipes
include 'teams.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $msgs = [];

    // Traitement du mot de passe
    $password = trim($_POST['password'] ?? '');
    if (!empty($password)) {
        if (file_put_contents($passwordFile, password_hash($password, PASSWORD_DEFAULT), LOCK_EX)) {
            $msgs[] = "✅ Mot de passe mis à jour.";
        } else {
            $msgs[] = "⚠️ Erreur lors de l'écriture du mot de passe.";
        }
    }

    // Traitement des autres champs de json.json
    if (!file_exists($jsonFile)) {
        $msgs[] = "Fichier JSON introuvable : $jsonFile";
    } else {
    $jsonData = json_decode(file_get_contents($jsonFile), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $msgs[] = "Erreur lecture JSON : " . json_last_error_msg();
    } else 
{
// Logo domicile et exterieur via menus déroulants
$domicile = trim($_POST['domicile'] ?? '');
if (!empty($domicile)) {
    $url = "https://om-sup.ovh/team/" . rawurlencode($domicile) . ".png";
    $jsonData['domicile'] = $url;
    $msgs[] = "✅ domicile mis à jour";
}
$exterieur = trim($_POST['exterieur'] ?? '');
if (!empty($exterieur)) {
    $url = "https://om-sup.ovh/team/" . rawurlencode($exterieur) . ".png";
    $jsonData['exterieur'] = $url;
    $msgs[] = "✅ exterieur mis à jour";

// GÉNÉRATION AUTO DU match-image À PARTIR DE domicile + exterieur ---
$domicile  = trim($_POST['domicile']  ?? '');
$exterieur = trim($_POST['exterieur'] ?? '');

// Conserve les URLs des logos si vide
if (!empty($domicile)) {
    $url = "https://om-sup.ovh/team/" . rawurlencode($domicile) . ".png";
    $jsonData['domicile'] = $url;
}
if (!empty($exterieur)) {
    $url = "https://om-sup.ovh/team/" . rawurlencode($exterieur) . ".png";
    $jsonData['exterieur'] = $url;
}

// Si les deux équipes sont renseignées, on construit l'URL match-image
if (!empty($domicile) && !empty($exterieur)) 
{
// champs de date/heure/compétition pour la forme quand je m'en fou mais besoin pour construire URL
$DD        = trim($_POST['DD']        ?? '');
$MM        = trim($_POST['MM']        ?? '');
$YYYY      = trim($_POST['YYYY']      ?? '');
$hh        = trim($_POST['hh']        ?? '');
$mm        = trim($_POST['mm']        ?? '');
$tournament= trim($_POST['tournament']?? ''); //peux être vide
$round     = trim($_POST['round']     ?? ''); //peux être vide
$channel   = trim($_POST['channel']   ?? ''); //peux être vide
$height    = trim($_POST['height']    ?? '');

// Valeurs par défaut (ma date de naissance)
if ($DD === '')    $DD = '08';
if ($MM === '')    $MM = '05';
if ($YYYY === '')  $YYYY = '1981';
if ($hh === '')    $hh = '14';
if ($mm === '')    $mm = '15';
if ($height === '') $height = '315';
}

// Requête interne "read" 
$readQuery = [
    'team_home' => $domicile,
    'team_away' => $exterieur,
    'tournament'=> $tournament,
    'round'     => $round,
    'DD'        => $DD,
    'MM'        => $MM,
    'YYYY'      => $YYYY,
    'channel'   => $channel,
    'hh'        => $hh,
    'mm'        => $mm,
    'height'    => $height,
];

// URL interne en clair
$innerReadUrl = 'https://om-sup.ovh/prez/?' . http_build_query($readQuery);

// Alimente les champs JSON avec l’URL en clair
$jsonData['match-image'] = $innerReadUrl;
$jsonData['playerBG']    = $innerReadUrl;
$msgs[] = "✅ match-image mis à jour";
}

// date debut stream
$dateInput = trim($_POST['date_debut_stream'] ?? '');
if (!empty($dateInput)) {
    $dt = DateTime::createFromFormat('Y-m-d\TH:i', $dateInput);
    if ($dt) {
        $jsonData['event_date'] = [
            'day' => (int)$dt->format('d'),
            'month' => (int)$dt->format('m'),
            'year' => (int)$dt->format('Y'),
            'hour' => (int)$dt->format('H'),
            'minute' => (int)$dt->format('i'),
            'second' => 0
        ];
        $msgs[] = "✅ event_date mis à jour : <code>{$dateInput}</code>";
    } else {
        $msgs[] = "⚠️ Format date invalide.";
    }
}

// sauvegarde des données JSON si des champs ont été mis à jour
if (count($msgs) > 0) { // Si des messages ont été ajoutés pour d'autres champs que le mot de passe
    if (file_put_contents($jsonFile, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX)) {
        // Le message sera construit après
    } else {
        $msgs[] = "Erreur lors de l'écriture dans le JSON.";
    }
            }
        }
    }
    
    // Construction du message final
    if (!empty($msgs)) {
        $message = implode("<br>", $msgs);
    } else {
        $message = "⚠️ Aucun champ rempli.";
    }
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Injection JSON - OM</title>
<style>
    body {
        font-family: 'Arial', sans-serif;
        background: #001f3f;
        color: #fff;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }
    .container {
        background: rgba(255,255,255,0.05);
        padding: 30px 40px;
        border-radius: 15px;
        box-shadow: 0 0 30px rgba(0,183,255,0.5);
        width: 500px;
        text-align: center;
    }
    h2 {
        color: #00b7ff;
        text-shadow: 0 0 15px #00b7ff;
        margin-bottom: 20px;
    }
    .logo {
        width: 100px;
        margin-bottom: 20px;
        filter: drop-shadow(0 0 15px #00b7ff);
    }
    label { display: block; margin-top: 15px; font-weight: bold; text-align:left; }
    input[type=text], input[type=datetime-local], input[type=password], select {
        width: 100%;
        padding: 8px;
        margin-top: 5px;
        border-radius: 5px;
        border: none;
        outline: none;
        box-shadow: inset 0 0 5px rgba(0,183,255,0.3);
        background: rgba(255,255,255,0.1);
        color: #fff;
    }
    select option { color: #000; }
    input::placeholder { color: rgba(255,255,255,0.6); }
    .btn-container { margin-top: 25px; }
    button {
        padding: 10px 25px;
        border: none;
        border-radius: 8px;
        background: #00b7ff;
        color: #001f3f;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        transition: 0.3s;
        box-shadow: 0 0 15px rgba(0,183,255,0.6);
    }
    button:hover {
        background: #00a3e0;
        box-shadow: 0 0 20px rgba(0,183,255,0.9);
    }
    .msg {
        margin-top: 20px;
        padding: 10px;
        background: rgba(0, 183, 255, 0.2);
        border-left: 4px solid #00b7ff;
        border-radius: 5px;
        color: #fff;
        text-align:left;
    }
    code { color: #00ffea; word-break: break-all; }
    .preview {
        margin-top: 10px;
    }
    .preview img {
        max-width: 100px;
        margin-top: 5px;
        filter: drop-shadow(0 0 5px #00b7ff);
    }
</style>
<script src="/js/admin.js"></script>
</head>
<body>
<div class="container">
    <img src="https://om-sup.ovh/team/OM.png" alt="Logo OM" class="logo">
    <h2>Mettre à jour JSON - OM</h2>
    <form method="post">
        <label>Date début stream :</label>
        <input type="datetime-local" name="date_debut_stream">

        <label>Logo domicile :</label>
        <select name="domicile" id="domicile" onchange="updateLogo('domicile','preview_domicile')">
            <option value="">-- Choisir une équipe --</option>
            <?php foreach ($teams as $team): ?>
                <option value="<?= htmlspecialchars($team) ?>"><?= htmlspecialchars($team) ?></option>
            <?php endforeach; ?>
        </select>
        <div class="preview" id="preview_domicile"></div>

        <label>Logo exterieur :</label>
        <select name="exterieur" id="exterieur" onchange="updateLogo('exterieur','preview_exterieur')">
            <option value="">-- Choisir une équipe --</option>
            <?php foreach ($teams as $team): ?>
                <option value="<?= htmlspecialchars($team) ?>"><?= htmlspecialchars($team) ?></option>
            <?php endforeach; ?>
        </select>
        <div class="preview" id="preview_exterieur"></div>

        <label>Page du Match :</label>
        <input type="text" name="streamUrl" placeholder="Nom page du match">

        <label>Mot de passe:</label>
        <input type="password" name="password" placeholder="Nouveau mot de passe">

        <label>post X :</label>
        <input type="text" name="post" placeholder="URL du post MDP">

        <div class="btn-container">
            <button type="submit">Injection</button>
        </div>
        <!-- Bouton Retour -->
<div style="text-align: center; margin-top: 40px;">
  <a href="index.html"
     style="
       display: inline-block;
       padding: 10px 20px;
       background-color: green;
       color: white;
       text-decoration: none;
       border-radius: 5px;
       font-weight: bold;
       transition: all 0.2s ease;
     "
     onmouseover="this.style.backgroundColor='#28b528'"
     onmouseout="this.style.backgroundColor='green'">
     ← Retour
  </a>
</div>
    </form>

    <?php if (!empty($message)): ?>
        <div class="msg"><?= $message ?></div>
    <?php endif; ?>
</div>

</body>
</html>