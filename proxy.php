<?php
// proxy.php
// Empêche la mise en cache
header("Content-Type: application/vnd.apple.mpegurl");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// URL du flux HTTP
$flux = "http://199.115.193.230/live/play/TURCSlJtSm1ZWGN3UjNSWU5FTm1ibGxNY25ac1ZEVXpjbXgxUTNFcmMwVTNMMmxrT0RSM2RYWXJSVDA9/124462";

// Lecture et envoi au navigateur
$context = stream_context_create([
    "http" => [
        "header" => "User-Agent: Mozilla/5.0\r\n"
    ]
]);

$contenu = @file_get_contents($flux, false, $context);

if ($contenu === false) {
    http_response_code(500);
    echo "# Erreur : impossible de récupérer le flux.";
    exit;
}

echo $contenu;
?>
