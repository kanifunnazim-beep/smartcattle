CREATE TABLE IF NOT EXISTS sc_migrations (name VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sc_entries (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 cow_id CHAR(4) CHARACTER SET ascii NOT NULL,
 recorded_date DATE NOT NULL,
 feed_kg DECIMAL(9,3) NULL,
 weight_kg DECIMAL(8,2) NULL,
 feed_type ENUM('kering','combor','basah') NULL,
 source ENUM('manual','automatic','legacy') NOT NULL,
 batch_id CHAR(32) CHARACTER SET ascii NULL,
 revision INT NOT NULL DEFAULT 1,
 updated_by INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY entry_date(recorded_date,id), KEY cow_date(cow_id,recorded_date,id), KEY batch_id(batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sc_scale_slots (
 device_id VARCHAR(32) CHARACTER SET ascii PRIMARY KEY,
 kind ENUM('weight','feed') NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO sc_scale_slots VALUES ('scale-weight-01','weight'),('scale-feed-01','feed');
CREATE TABLE IF NOT EXISTS sc_scale_sessions (
 seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
 id CHAR(32) CHARACTER SET ascii PRIMARY KEY,
 device_id VARCHAR(32) CHARACTER SET ascii NOT NULL,
 kind ENUM('weight','feed') NOT NULL,
 cow_id CHAR(4) CHARACTER SET ascii NULL,
 feed_type ENUM('kering','combor','basah') NULL,
 state ENUM('waiting','completed','cancelled','expired') NOT NULL DEFAULT 'waiting',
 created_by INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at DATETIME NOT NULL,
 completed_at DATETIME NULL,
 result_kg DECIMAL(9,2) NULL,
 KEY active_device(device_id,state,created_at)
) ENGINE=InnoDB;
