<?php
header('Content-Type: application/json');
$ip = file_get_contents('.ip');
echo json_encode(['ip' => trim($ip)]);

?>
