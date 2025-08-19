<?php
// checkPassword.php
header('Content-Type: application/json');

$storedPassword = trim(file_get_contents('/home/vpsfyhi/.password')); // chemin sécurisé
$entered = $_POST['password'] ?? '';

if ($entered === $storedPassword) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
