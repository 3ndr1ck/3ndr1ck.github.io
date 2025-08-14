<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

// Pour gérer les pré-requêtes CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// URL de base de ton flux HLS HTTP
$baseUrl = "http://199.115.193.230/live/play/V1VwV1pGaDFVa2RGY0ZJellqVlVaRWswTDJaRFpreEVkVXhZTkhkb2JXTmtNMjgwYkhjMlpHd3lWVDA9/124462";

// Si un fichier TS est demandé
if (isset($_GET['file'])) {
    $url = $baseUrl . '/' . basename($_GET['file']);
    header("Content-Type: video/mp2t");
    readfile($url);
    exit;
}

// Sinon, on sert le .m3u8 en modifiant les URLs des segments
header("Content-Type: application/vnd.apple.mpegurl");

// Récupère la playlist m3u8
$m3u8Content = file_get_contents($baseUrl . "/index.m3u8");

// Réécrit les URLs pour passer par ce proxy
$m3u8Content = preg_replace_callback('/(.*\.ts)/', function($matches) {
    return 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'] . '?file=' . urlencode($matches[1]);
}, $m3u8Content);

// Envoie la playlist modifiée
echo $m3u8Content;
