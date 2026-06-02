<?php
header('Content-Type: application/json');

// Memanggil koneksi database
require_once 'koneksi.php';

// Pastikan request adalah POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Mengecek apakah ada file gambar yang diupload
    if (isset($_FILES['gambar']) && isset($_POST['tingkat_luka'])) {
        $file = $_FILES['gambar'];
        $tingkat_luka = $_POST['tingkat_luka'];

        // Mengecek tidak ada error saat upload file
        if ($file['error'] === UPLOAD_ERR_OK) {
            $tmp_name = $file['tmp_name'];
            $name = basename($file['name']);
            
            // Generate nama file unik agar tidak tertimpa
            $ext = pathinfo($name, PATHINFO_EXTENSION);
            $nama_file_baru = uniqid() . '.' . $ext;
            
            // Path tujuan (asumsi folder uploads ada di sejajar dengan folder api)
            $folder_tujuan = '../uploads/';
            $path_tujuan = $folder_tujuan . $nama_file_baru;

            // Memindahkan file yang diupload ke folder tujuan
            if (move_uploaded_file($tmp_name, $path_tujuan)) {
                
                // Menyimpan ke database
                // Menggunakan prepared statement untuk keamanan dari SQL Injection
                $stmt = $conn->prepare("INSERT INTO riwayat_skrining (path_gambar, tingkat_luka) VALUES (?, ?)");
                $path_db = 'uploads/' . $nama_file_baru; // Path relatif untuk disimpan di database
                $stmt->bind_param("ss", $path_db, $tingkat_luka);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "status" => "sukses",
                        "pesan" => "Data berhasil disimpan!",
                        "path_gambar" => $path_db
                    ]);
                } else {
                    echo json_encode([
                        "status" => "gagal",
                        "pesan" => "Gagal menyimpan ke database: " . $stmt->error
                    ]);
                }
                $stmt->close();
            } else {
                echo json_encode([
                    "status" => "gagal",
                    "pesan" => "Gagal memindahkan file ke folder uploads."
                ]);
            }
        } else {
            echo json_encode([
                "status" => "gagal",
                "pesan" => "Error saat upload file. Kode error: " . $file['error']
            ]);
        }
    } else {
        echo json_encode([
            "status" => "gagal",
            "pesan" => "Data gambar atau tingkat luka tidak lengkap."
        ]);
    }
} else {
    echo json_encode([
        "status" => "gagal",
        "pesan" => "Metode request tidak valid. Gunakan POST."
    ]);
}
$conn->close();
?>
