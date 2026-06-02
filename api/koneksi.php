<?php
$host = "localhost";
$user = "root";
$password = "";
$database = "database_pemweb";

$conn = mysqli_connect($host, $user, $password, $database);

if (!$conn) {
    die(json_encode([
        "status" => "error",
        "pesan" => "Koneksi gagal: " . mysqli_connect_error()
    ]));
}
?>