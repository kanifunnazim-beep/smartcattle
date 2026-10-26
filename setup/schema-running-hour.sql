-- Satu tabel baru; tidak mengubah tabel yang sudah ada.
CREATE TABLE IF NOT EXISTS sc_running_hours (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 recorded_date DATE NOT NULL,
 duration_minutes SMALLINT UNSIGNED NOT NULL,
 request_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 deleted TINYINT UNSIGNED NOT NULL DEFAULT 0,
 updated_by INT UNSIGNED NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY history_date (deleted,recorded_date,id),
 CONSTRAINT rh_duration CHECK (duration_minutes BETWEEN 1 AND 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
