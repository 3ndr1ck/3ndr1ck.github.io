<?php
// Autoriser CORS pour que GitHub Pages puisse y accéder
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

// Vérification pour OPTIONS (pré-requête CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// URL de ton flux vidéo HTTP
$url = "http://199.115.193.230/live/play/TURCSlJtSm1ZWGN3UjNSWU5FTm1ibGxNY25ac1ZEVXpjbXgxUTNFcmMwVTNMMmxrT0RSM2RYWXJSVDA9/124462";

// Détection de l'extension pour le type MIME
$ext = strtolower(pathinfo($url, PATHINFO_EXTENSION));
if ($ext === "m3u8") {
    header("Content-Type: application/vnd.apple.mpegurl");
} elseif ($ext === "ts") {
    header("Content-Type: video/mp2t");
} else {
    header("Content-Type: application/octet-stream");
}

// Lecture du flux et envoi direct au navigateur
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_exec($ch);
curl_close($ch);
