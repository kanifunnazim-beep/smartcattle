# Panduan penerapan bertahap — jangan jalankan seluruh dokumen sekaligus

Paket belum diterapkan ke VPS. Setiap tahap yang mengubah VPS dikerjakan setelah persetujuan pengguna. Mulai dengan staging dan pengujian; jangan langsung git pull ke folder web aktif.

## 1. Persiapan di komputer

Ekstrak ZIP. Baca REVISI-V2-BACA-DULU.md. Folder smartcattle-main adalah isi proyek, bukan folder tambahan untuk diletakkan di dalam /var/www/smart-cattle.

Jangan unggah /etc/smartcattle-web.php, token bridge, password MQTT, atau backup database ke GitHub.

## 2. Pemeriksaan baca-saja di VPS sebelum menentukan lingkungan uji

Di SSH:
```bash
php -v
php -m
sudo mysql -e "SELECT VERSION(), @@global.time_zone, @@session.time_zone, NOW();"
git -C /var/www/smart-cattle status --short
```
Butuh PHP 8.1+ dengan mysqli/mysqlnd, MySQL 8+ (ROW_NUMBER), dan HTTPS untuk akun. Kirim hasil tanpa konfigurasi password. Node-RED menggunakan local HTTP bridge pada Apache port 8081 yang sudah ada; pastikan port itu masih melayani /var/www/smart-cattle. Tidak perlu mengubah API fan atau sensor.

## 3. Staging terpisah (setelah menyepakati lokasi dan izin)

Siapkan salinan web di luar DocumentRoot produksi dan database uji terpisah. Konfigurasi /etc/smartcattle-web.php pada host/container uji harus menunjuk database uji. Karena aplikasi memakai path absolut tersebut, jangan mengganti konfigurasi global VPS produksi untuk menguji! Gunakan host/container uji terpisah, atau sepakati penyesuaian konfigurasi staging lebih dahulu.

Sebelum menjalankan file PHP, pemeriksaan sintaks dari folder paket:
```bash
find . -name '*.php' -type f -exec php -l {} \;
php tests/domain.php
node --check app.js
node --check petugas.js
node --check reports.js
node --check scales.js
node tests/flow.cjs
node tests/ui-state.cjs
```
Dua perintah node tests hanya menguji logika dengan tiruan. Jika Playwright dan Chromium tersedia, `node tests/browser.cjs` menguji browser dengan API tiruan. Tetap lanjutkan pengujian backend nyata berikut.

Pada host uji, pasang salinan skema/data lama dan akun uji. Jalankan:
```bash
sudo php setup/migrate-v2.php --admin
```
`--admin` memakai akun MySQL root melalui koneksi localhost/socket dan membaca nama database dari konfigurasi. Jika root socket tidak tersedia, jangan mengganti password; siapkan metode admin yang sesuai terlebih dahulu. Tanpa --admin, script memakai akun konfigurasi yang harus memiliki hak DDL.

Migrasi dapat dijalankan kembali: role/tabel dibuat bila belum ada; data lama disalin hanya sekali. Jika gagal, hentikan dan periksa pesan; jangan menghapus tabel lama.

Berikan akun aplikasi hak SELECT, INSERT, UPDATE, DELETE pada sc_entries, sc_scale_slots dan sc_scale_sessions. Contoh untuk akun yang disebut dokumentasi lama (pastikan sesuai konfigurasi aktual):
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_entries TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_scale_slots TO 'smart_cattle_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_cattle.sc_scale_sessions TO 'smart_cattle_user'@'localhost';
```
Pada host uji, sesuaikan nama database/akun uji; jangan jalankan GRANT produksi untuk tahap uji. Hak sc_users/sc_settings/sc_audit/sc_login_attempts sebelumnya tetap diperlukan.

## 4. Pengujian integrasi wajib pada staging

1. Bandingkan jumlah dan nilai sc_records dengan sc_entries sesaat setelah migrasi. NULL tetap NULL; akun petugas lama masih login. Jalankan migrasi kedua kali dan pastikan tidak menggandakan data.
2. Buat akun PLN melalui `sudo php setup/create-user.php`; pilih peran pln. Akun baru dibuat tanpa menimpa akun existing.
3. Tanpa login, URL langsung report-api.php harus 401. Setelah login PLN, keempat laporan bisa diunduh. Akses POST settings/records/scale_sessions memakai sesi PLN harus 403. Logout/akun nonaktif/sesi lewat 8 jam harus mengunci laporan, termasuk ketika cache tersedia.
4. Uji catatan manual: beberapa pemberian jenis sama/berbeda pada hari sama, koreksi satu baris, hapus satu baris, konflik dua browser (revision lama harus 409). Total grafik/PDF harus mengikuti baris yang tersimpan.
5. Buat sesi timbangan dari dua browser serentak: hanya satu sesi per alat. Hasil stabil harus tersimpan sekali; kirim ulang payload identik tidak boleh menambah baris. Bobot berbeda untuk ID sesi selesai harus ditolak.
6. Pakan 100.25 kg harus membuat tepat 10 baris @10.025 kg dengan jumlah tepat 100.25 kg. Uji rollback kegagalan INSERT agar tidak meninggalkan pembagian parsial.
7. Hasil tanpa sesi, sesi batal/expired, device salah, unstable, nol, terlalu besar, atau desimal berlebih harus ditolak. Setelah menghapus catatan hasil otomatis, kirim ulang hasil sesi selesai: catatan tidak boleh muncul kembali.
8. Uji koneksi terputus sebelum/sesudah commit. ESP simulator mengulang payload yang sama; ACK harus saved setelah berhasil. Refresh web saat sesi aktif menampilkan sesi yang sama.
9. Periksa UI desktop/ponsel, PDF dengan beberapa pemberian, login/logout, grafik kesehatan, lingkungan, fan, pengaturan ambang, baterai, dan ruminasi.
10. Catat hasil uji; jangan lanjut produksi jika ada kegagalan. Konfigurasi waktu MySQL/Node-RED/Apache diuji pada WIB terutama dekat pergantian hari.

## 5. Bridge Node-RED tanpa restart layanan — setelah izin

Token sekarang memakai **environment tingkat flow/tab Node-RED**, bukan environment service Linux. Tidak memakai systemctl edit, daemon-reload, atau restart nodered. Fungsi baru tetap memakai env.get('SC_SCALE_TOKEN'), yang dibaca dari konfigurasi tab tambahan.

Pada VPS, setelah backup konfigurasi dan membaca script:
```bash
sudo php setup/prepare-bridge.php
```
Script menambahkan scale_bridge_token ke konfigurasi PHP dan membuat `/root/smartcattle-scales-private.json` mode 600. Isinya flow tambahan dengan token pada environment tab. Token tidak dicetak. File konfigurasi PHP lama dicadangkan mode 600. Script mengharapkan konfigurasi berupa array sederhana seperti config.example.php; periksa secara lokal terlebih dahulu, jangan kirim isinya ke chat. Flow privat yang sudah ada tidak ditimpa.

**Flow privat mengandung token.** Jangan unggah ke GitHub, chat, atau folder web. Template nodered-scales-v2.json dalam paket tidak mengandung token dan tidak dapat dipakai untuk menyimpan hasil sampai dikonfigurasi.

Langkah import:
1. Salin file privat dari VPS ke komputer melalui SCP/SFTP yang biasa Anda gunakan. Jika memakai CMD Windows, buka terminal lokal terpisah; gunakan `scp root@ALAMAT_VPS:/root/smartcattle-scales-private.json .` dengan alamat SSH Anda sendiri.
2. Buka editor Node-RED. Pastikan tidak ada perubahan tertunda pada tab/node lama. Jika ada, berhenti dan periksa bersama sebelum deploy.
3. Import file privat sebagai tab tambahan **SmartCattle - Timbangan v2**. Jangan memilih penggantian flow lama. Jika tab dengan ID/nama ini sudah ada, jangan mengimpor duplikat; periksa terlebih dahulu.
4. Pada node MQTT baru, pilih konfigurasi broker lokal yang sudah digunakan SmartCattle melalui dropdown. Jangan mengedit konfigurasi broker existing. Jangan mengubah node sensor, lingkungan, atau fan.
5. Buka dropdown di samping tombol Deploy dan pilih **Modified Flows**, bukan Full. Pastikan hanya tab baru yang memiliki perubahan. Deploy ini memulai node di tab baru; flow lama tidak ditargetkan untuk dimulai ulang. Jika editor memperlihatkan perubahan konfigurasi bersama atau tab lama, batalkan dahulu.
6. Periksa indikator Bridge aktif dan pastikan debug/data kesehatan serta lingkungan tetap masuk. Tanpa alat, sesi hanya menunggu, dapat dibatalkan, atau kedaluwarsa.

Tidak ada restart layanan Node-RED dalam prosedur ini. Deploy tetap diperlukan untuk mengaktifkan flow baru. Kita tidak menjanjikan tanpa gangguan jika ada perubahan lain yang ikut dideploy; karena itu daftar perubahan perlu diperiksa sebelum menekan Deploy.

Pastikan local URL http://127.0.0.1:8081/scale-api.php sesuai Apache. API ini membutuhkan IP loopback DAN token; jangan membuka token atau endpoint ini melalui reverse proxy publik. Ekspor tab yang sudah dikonfigurasi juga mengandung token; simpan hanya di lokasi privat. Editor Node-RED harus hanya diakses pengelola yang berwenang.

Jika sebelumnya pernah menerapkan panduan environment service versi lama, berhenti dan laporkan dahulu. Jangan menghapus drop-in atau file environment secara otomatis. Untuk sesi ini, belum ada pemasangan versi lama yang dilaporkan.

## 6. Produksi — dilakukan bersama setelah hasil staging diterima

Sebelum unggah/pull, ambil backup di luar folder publik:
```bash
SC_BACKUP="/root/smartcattle-before-v2-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$SC_BACKUP"
tar -czf "$SC_BACKUP/web.tar.gz" -C /var/www smart-cattle
sudo mysqldump --single-transaction smart_cattle > "$SC_BACKUP/smart_cattle.sql"
sudo cp -p /etc/smartcattle-web.php "$SC_BACKUP/"
git -C /var/www/smart-cattle rev-parse HEAD > "$SC_BACKUP/git-commit.txt"
```
Pastikan dump sukses dan dapat dipulihkan pada staging. Ekspor flow Node-RED lama ke lokasi privat; kredensial tidak dimasukkan GitHub.

Tetapkan jeda input petugas selama migrasi dan pergantian kode. Untuk menjamin tidak ada penulisan ke sc_records lama setelah disalin, batasi sementara akses route web-api.php pada Apache selama cutover; aturan tepatnya disiapkan setelah melihat konfigurasi terkait dan mendapat izin. Sensor tetap dapat menulis ke tabel kesehatan/lingkungan. Jangan hanya mengandalkan pengguna menutup browser.

Urutan cutover: blokir sementara akses API petugas -> jalankan migrasi dari paket staging yang sudah lolos -> berikan hak tabel baru -> unggah perubahan sumber ke GitHub -> tinjau diff -> git pull --ff-only -> verifikasi lint/config -> buka kembali API petugas -> uji login/catatan/laporan. Jangan melakukan pull dulu ketika database belum dimigrasi. Catat bahwa API petugas sementara tidak tersedia selama jeda ini.

Jangan menjalankan schema.sql lama untuk mengganti database. Jangan git reset --hard, git clean, rsync --delete, atau menimpa api-test.php/api-environment.php. tests/ boleh tidak dipublikasikan; jika disertakan dilindungi .htaccess.

Pembuatan akun PLN: `sudo php setup/create-user.php`, masukkan username baru, pilih pln, password 12–72 byte. Password ditentukan pengguna secara privat, tidak ada akun default. Akun petugas lama tidak perlu dibuat ulang.

## 7. Pemulihan

Jika belum ada catatan baru v2, rollback file ke backup sambil mempertahankan tabel tambahan; jangan restore seluruh database karena sensor terus masuk. Nonaktifkan tab timbangan tambahan agar tidak menerima hasil selama rollback.

Jika sudah ada catatan v2, kode lama membaca sc_records dan tidak akan melihatnya. Jangan rollback tanpa rekonsiliasi sc_entries ke format lama; satu baris per hari tidak mewakili seluruh detail jenis pakan. Simpan data v2, hentikan input sementara, dan tentukan pemulihan bersama. Mengembalikan kode lama juga membuka kembali laporan publik, sehingga akses laporan harus tetap dibatasi selama pemulihan.
