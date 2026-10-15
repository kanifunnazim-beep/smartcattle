# Instalasi login petugas dan pakan/bobot

Paket ini untuk PHP 8.1+ dengan ekstensi mysqli dan MySQL/MariaDB.
Monitoring lama tetap memakai api-test.php, api-environment.php dan /api/fan.
Jangan mengganti file PHP sensor yang sudah berjalan.

## 1. Sebelum git pull (terminal VPS)

```bash
cd /var/www/smart-cattle
git status --short
BACKUP_DIR="/root/smartcattle-before-login-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp app.js index.html style.css "$BACKUP_DIR/"
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
sudo mysqldump --single-transaction smart_cattle > "$BACKUP_DIR/smart_cattle.sql"
```

Pastikan backup berhasil (bukan file kosong). Jangan upload backup database ke GitHub.
Jika file tracked berstatus M, selesaikan dahulu; jangan reset atau memaksa pull.
File API sensor untracked tetap dibiarkan.

## 2. Unggah paket ke GitHub lalu tarik

Unggah file di tingkat folder web, bukan ZIP atau folder bertingkat:
app.js, index.html, style.css, petugas.js, web-api.php dan folder setup
(termasuk setup/.htaccess). Logo boleh tetap.
Tidak ada password nyata di paket ini.

```bash
cd /var/www/smart-cattle
git pull --ff-only
php -v
php -m
php -l web-api.php
php -l setup/create-user.php
```

PHP minimum 8.1. Pastikan modul mysqli tersedia pada CLI dan PHP Apache.
Folder setup diblokir lewat .htaccess (virtual host saat ini AllowOverride All).
create-user.php juga menolak akses selain CLI. Jangan ubah aturan akses itu.

## 3. Konfigurasi database di LUAR folder web

```bash
sudo test -e /etc/smartcattle-web.php && echo "Konfigurasi sudah ada: jangan timpa"
```

Hanya jika file belum ada:

```bash
sudo install -o root -g www-data -m 640 setup/config.example.php /etc/smartcattle-web.php
sudo nano /etc/smartcattle-web.php
```

Isi password database yang sama dengan koneksi smart_cattle_user yang sudah bekerja.
Jangan menggunakan password MQTT. File ini tidak boleh dimasukkan ke GitHub.
Jika password berisi tanda petik tunggal atau backslash, escape sesuai string PHP
(\' dan \\). Jangan kirim password ke chat.

```bash
sudo php -l /etc/smartcattle-web.php
```

## 4. Tambahkan tabel

```bash
sudo mysql smart_cattle < setup/schema.sql
```

Perintah hanya CREATE TABLE IF NOT EXISTS dan INSERT IGNORE default pengaturan.
Tidak mengubah tabel kesehatan_sapi dan lingkungan_kandang.
Tabel baru: sc_users, sc_settings, sc_records, sc_login_attempts, sc_audit.

Jika akun database tidak punya hak atas tabel baru, jalankan di `sudo mysql`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_users TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_settings TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_records TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_login_attempts TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_audit TO 'smart_cattle_user'@'localhost';
EXIT;
```

Akun database tidak memerlukan hak CREATE untuk operasional web setelah instalasi.

## 5. Buat akun petugas

```bash
sudo php setup/create-user.php
```

Masukkan username baru, password 12–72 byte, lalu ulangi password. Password tidak
ditampilkan dan disimpan dengan password_hash. Tidak ada akun/password default.
Jika username sudah ada, script menolak tanpa menimpa akun. Jalankan kembali
untuk menambah petugas lain. Semua akun petugas pada versi ini punya hak yang sama.

## 6. Uji penerapan

Buka https://smartcattle.iotcenter.my.id dan Ctrl+F5.
1. Tanpa login: dashboard, HR, lingkungan, fan dan pakan tetap dapat dibaca.
2. Klik Pengaturan: dialog login muncul; coba password salah sekali, harus gagal.
3. Login akun baru: formulir pengaturan dan pakan/bobot terbuka.
4. Catat data pengujian yang diketahui pada satu sapi; pastikan angka dan tanggal
   sesuai, lihat grafik, kemudian hapus catatan uji bila bukan data operasional.
5. Ubah catatan yang sama: jangan menghasilkan dua baris sapi/tanggal yang sama.
6. Ubah ambang; buka browser lain dan tunggu maksimal 30 detik, harus mengikuti.
7. Logout: Pengaturan kembali terkunci; tombol ubah/hapus catatan hilang.
8. Pastikan data sensor terbaru dan fan masih masuk seperti sebelumnya.

Tidak perlu restart broker, Node-RED, database atau Apache untuk perubahan file ini.
Login memerlukan HTTPS. Sesi berakhir maksimal 8 jam setelah login.
Percobaan login dibatasi 10 per username / 50 per IP dalam 15 menit.

## Diagnostik

- Pesan belum dikonfigurasi: periksa keberadaan dan izin /etc/smartcattle-web.php.
- Layanan belum siap: periksa tabel, hak database, versi PHP dan log Apache.
- 403 saat simpan: muat ulang lalu login kembali (token sesi berubah).
- 409 saat simpan: ada perubahan oleh sesi lain; klik Muat tersimpan/Muat catatan
  dan periksa sebelum mengulangi. Tidak ada penimpaan otomatis.
- 429 saat login: tunggu 15 menit.
- Screenshot hasil boleh dikirim, jangan sertakan password.

## Pemulihan

Pulihkan app.js/index.html/style.css dari backup jika perlu. Fitur monitoring
lama tidak memerlukan tabel baru. Jangan hapus tabel sensor atau me-restore
seluruh database untuk rollback tampilan karena itu bisa menghilangkan data baru.
Jika menonaktifkan fitur petugas, pindahkan web-api.php dari folder web ke backup
root (jangan ubah ekstensi menjadi .bak di folder publik); tabel catatan tetap disimpan.
