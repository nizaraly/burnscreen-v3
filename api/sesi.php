<?php
echo __DIR__;
echo "<br>";
echo file_exists(__DIR__ . '/koneksi.php') ? 'koneksi.php DITEMUKAN' : 'koneksi.php TIDAK DITEMUKAN';
?>