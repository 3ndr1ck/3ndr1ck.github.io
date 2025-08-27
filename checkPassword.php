<?php
// checkPassword.php
header('Content-Type: application/json');

// chemin sécurisé
$storedPasswordHash = trim(file_get_contents('/home/vpsfyhi/.password')); 
$enteredPassword = $_POST['password'] ?? '';

// On utilise password_verify() pour comparer le mot de passe en clair avec le hachage
if (password_verify($enteredPassword, $storedPasswordHash)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
?>