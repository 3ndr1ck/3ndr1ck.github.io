<?php
// json.php
header('Content-Type: application/json');

// Assurez-vous que le chemin vers votre fichier JSON est correct
// et qu'il n'est pas accessible directement par le navigateur.
$jsonFile = '/json.json'; 

if (file_exists($jsonFile)) {
    $jsonData = file_get_contents($jsonFile);
    $encodedData = base64_encode($jsonData);
    echo json_encode(['data' => $encodedData]);
} else {
    echo json_encode(['error' => 'Fichier de données introuvable.']);
}

?>

