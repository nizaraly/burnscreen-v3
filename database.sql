CREATE DATABASE IF NOT EXISTS `database_pemweb`;
USE `database_pemweb`;

CREATE TABLE IF NOT EXISTS `riwayat_skrining` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `path_gambar` varchar(255) NOT NULL,
  `tingkat_luka` varchar(100) NOT NULL,
  `waktu_akses` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
