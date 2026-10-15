# Pemasangan laporan PDF publik

Paket melanjutkan versi login/pakan yang sudah berjalan, termasuk setup/.htaccess.
Tidak perlu membuat ulang akun, mengisi ulang password, atau mengimpor schema.sql.
Tabel sensor dan konfigurasi MQTT/Node-RED tidak diubah.

## File yang berubah/ditambahkan

- index.html, app.js, style.css: halaman Laporan aktif, label amonia diperbaiki.
- reports.js: formulir dan pembentukan PDF di browser.
- report-api.php: endpoint ringkasan publik, hanya SELECT ke database.
- vendor/: jsPDF 4.2.1, AutoTable 5.0.9 dan lisensi. Dimuat saat unduh pertama.
- setup/INSTALL-REPORTS.md dan setup/REVISI-LAPORAN.txt: petunjuk.

petugas.js, web-api.php, logo, akun, dan konfigurasi login tetap.
Jangan unggah /etc/smartcattle-web.php atau file API sensor berisi password.

## 1. Backup file VPS sebelum pull

```bash
cd /var/www/smart-cattle
git status --short
REPORT_BACKUP="/root/smartcattle-before-reports-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_BACKUP"
chmod 700 "$REPORT_BACKUP"
cp -p app.js index.html style.css petugas.js web-api.php "$REPORT_BACKUP/"
git rev-parse HEAD > "$REPORT_BACKUP/git-commit.txt"
```

Jika ada perubahan tracked M/D, jangan reset atau memaksa pull. Dua file API
sensor untracked yang sudah ada tetap dibiarkan.

## 2. Unggah isi paket ke GitHub dan tarik di VPS

Pertahankan susunan folder, terutama vendor/ dan setup/.htaccess. Jangan memasukkan
folder pembungkus atau ZIP sebagai pengganti file aplikasi.

```bash
git pull --ff-only
php -l report-api.php
ls -l vendor/jspdf.umd.min.js vendor/jspdf.plugin.autotable.min.js
```

PHP minimum 8.1; MySQL 8+ untuk ROW_NUMBER(). API MySQL aktif yang sudah digunakan
adalah basis implementasi. Laporan tidak mengubah database.

## 3. Siapkan cache di luar folder web

```bash
sudo install -d -o www-data -g www-data -m 750 /var/cache/smartcattle-reports
sudo -u www-data test -w /var/cache/smartcattle-reports && echo "Cache siap ditulis"
```

Path ini khusus ringkasan laporan. Tidak berisi password atau cookie.
Maksimum 128 ringkasan disimpan; file lama dibersihkan saat pembuatan ringkasan baru.
Jangan membuat folder cache di dalam /var/www/smart-cattle.
Tidak perlu restart Apache, broker, Node-RED, atau database.

## 4. Uji endpoint dan cache secara berurutan

```bash
REPORT_DAY=$(TZ=Asia/Jakarta date +%F)
curl -sS --max-time 25 --get \
  --data-urlencode 'type=health' \
  --data-urlencode 'cow=C001' \
  --data-urlencode "from=$REPORT_DAY" \
  --data-urlencode "to=$REPORT_DAY" \
  'https://smartcattle.iotcenter.my.id/report-api.php'
```

Ulangi perintah curl sekali. Harus status success. cache_hit boleh false pada
permintaan pertama, lalu true pada permintaan kedua (dalam 120 detik).
Data kosong tetap sukses, tidak direkayasa menjadi angka nol.
Jika gagal, kirim pesan error, bukan konfigurasi password.

## 5. Uji di browser

1. Ctrl+F5. Buka Laporan pada mode pengunjung (tanpa login).
2. Pilih Harian ternak, C001, periode satu hari yang memiliki pembacaan.
3. Klik Unduh PDF. Pastikan judul, logo, waktu WIB, angka dan halaman terbaca.
4. Bandingkan hasil satu hari dengan data sumber. Coba juga semua sapi / 7 hari.
5. Uji Lingkungan, Pakan & Bobot, dan Perangkat.
6. Uji periode kosong: PDF menyatakan tidak ada data.
7. Uji rentang >31 hari: harus ditolak.
8. Pastikan login, catatan pakan, notifikasi, grafik dan fan masih bekerja.

Perangkat menggunakan snapshot waktu data terakhir saat ringkasan disiapkan,
bukan periode histori. Status koneksi hanya inferensi kesegaran data database.

## Perilaku cache dan pembatasan beban

- Ringkasan kesehatan, lingkungan, pakan: 120 detik.
- Snapshot perangkat: 30 detik.
- Waktu penyusunan data tercetak di PDF, terpisah dari waktu ekspor.
- Perubahan ambang/catatan dapat baru terlihat setelah cache habis.
- Cache hit dibaca tanpa koneksi database.
- Satu cache miss dihitung pada satu waktu. Jika sibuk, HTTP 503 + Retry-After: 3;
  antarmuka menampilkan pesan dan mengaktifkan lagi tombol (tidak retry otomatis).
- Anggaran query dibatasi; pilih periode lebih pendek jika terjadi timeout.
- Data PDF dibuat di browser, bukan rendering server. Tidak ada CDN eksternal.
- Tidak ada load test 20 pengunjung terhadap VPS pada tahap pembuatan ini.
  Uji peluncuran dilakukan bertahap dengan pemantauan, bukan menjanjikan kapasitas.

## Diagnostik

- 503 cache belum disiapkan: periksa langkah 3.
- 503 laporan lain sedang disiapkan: tunggu beberapa detik dan coba lagi.
- 503 kesalahan lainnya: periksa log /var/log/apache2/smartcattle-domain-error.log.
- 400: periode/jenis/ID sapi tidak valid.
- Komponen PDF gagal dimuat: pastikan folder vendor ikut diunggah dan dapat diakses.
- Respons API kosong/HTML: cek sintaks PHP dan URL report-api.php.

## Rollback tampilan

Pulihkan app.js/index.html/style.css dari backup jika diperlukan. Jangan rollback
seluruh database atau menghapus tabel sensor. Endpoint laporan hanya membaca data.
Akun login dan catatan pakan tidak dipengaruhi pembaruan ini.
