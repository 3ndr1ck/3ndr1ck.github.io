<?php
header('Content-Type: application/json');
$ip = file_get_contents('/home/vpsfyhi/.ip');
echo json_encode(['ip' => trim($ip)]);
?>