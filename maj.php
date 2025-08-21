<?php
$jsonFile = '/home/vpsfyhi/json.json'; 
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!file_exists($jsonFile)) {
        $message = "Fichier JSON introuvable : $jsonFile";
    } else {
        $jsonData = json_decode(file_get_contents($jsonFile), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $message = "Erreur lecture JSON : " . json_last_error_msg();
        } else {
            $msgs = [];

            $fluxUrl = trim($_POST['fluxUrl'] ?? '');
            if (!empty($fluxUrl)) {
                $jsonData['fluxUrl'] = $fluxUrl;
                $msgs[] = "✅ fluxUrl mis à jour : <code>$fluxUrl</code>";
            }

            $matchUrl = trim($_POST['matchImage'] ?? '');
            if (!empty($matchUrl)) {
                $parts = parse_url($matchUrl);
                parse_str($parts['query'] ?? '', $queryParams);
                if (!empty($queryParams['read'])) {
                    $readUrl = urldecode($queryParams['read']);
                    $readParts = parse_url($readUrl);
                    parse_str($readParts['query'] ?? '', $readQuery);
                    $readQuery['height'] = 315;
                    $newReadUrl = $readParts['scheme'] . '://' . $readParts['host'] . $readParts['path'] . '?' . http_build_query($readQuery);
                    $jsonData['match-image'] = $newReadUrl;
                    $msgs[] = "✅ match-image mis à jour : <code>$newReadUrl</code>";
                } else {
                    $msgs[] = "⚠️ Paramètre read introuvable pour match-image.";
                }
            }

            $fields = ['domicile', 'exterieur', 'post', 'streamUrl'];
            foreach ($fields as $field) {
                $val = trim($_POST[$field] ?? '');
                if (!empty($val)) {
                    if (in_array($field, ['domicile','exterieur']) && strcasecmp($val, 'OM') === 0) {
                        $val = 'https://om-sup.ovh/team/OM.png';
                    }
                    $jsonData[$field] = $val;
                    $msgs[] = "✅ $field mis à jour : <code>$val</code>";
                }
            }

            $dateInput = trim($_POST['date_debut_stream'] ?? '');
            if (!empty($dateInput)) {
                // format du input datetime-local: yyyy-mm-ddThh:mm
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

            if (!empty($msgs)) {
                if (file_put_contents($jsonFile, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX)) {
                    $message = implode("<br>", $msgs);
                } else {
                    $message = "Erreur lors de l'écriture dans le JSON.";
                }
            } else {
                $message = "⚠️ Aucun champ rempli.";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Injection JSON OM STREAM TV</title>
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
        width: 400px;
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
    label { display: block; margin-top: 15px; font-weight: bold; }
    input[type=text], input[type=datetime-local] {
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
    }
    code { color: #00ffea; word-break: break-all; }
</style>
</head>
<body>
<div class="container">
    <img src="https://om-sup.ovh/team/OM.png" alt="Logo OM" class="logo">
    <h2>Injection JSON OM STREAM TV</h2>
    <form method="post">
        <label>Date début stream :</label>
        <input type="datetime-local" name="date_debut_stream">

        <label>Affiche du Match:</label>
        <input type="text" name="matchImage" placeholder="URL affiche match">

        <label>Page du Match :</label>
        <input type="text" name="fluxUrl" placeholder="Nom page du match">

        <label>Logo domicile :</label>
        <input type="text" name="domicile" placeholder="URL logo domicile">

        <label>Logo exterieur :</label>
        <input type="text" name="exterieur" placeholder="URL logo exterieur">

        <label>post X :</label>
        <input type="text" name="post" placeholder="URL du post MDP">

        <label>Flux Stream:</label>
        <input type="text" name="streamUrl" placeholder="URL du stream">

        <div class="btn-container">
            <button type="submit">Injection</button>
        </div>
    </form>
    <?php if (!empty($message)): ?>
        <div class="msg"><?= $message ?></div>
    <?php endif; ?>
</div>
</body>
</html>
