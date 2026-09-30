# SmartCattle — revisi permintaan client

Perubahan: CCTV (menu, preview, halaman, perangkat kamera) dihapus; aktivitas gerakan/score/diagram dan alert aktivitas dihapus; daftar sapi C001–C010. Ruminasi dipertahankan.

Data contoh: 10 sapi, 6 Normal, 3 Warning, 1 Critical; 1 wearable offline. Offline merupakan status perangkat terpisah dari kesehatan sapi. C009/C010 merupakan tambahan data contoh, bukan hasil sensor. Daftar perangkat contoh: 10 wearable dan 1 sensor kandang.

Desain utama dan integrasi API tetap. api-test.php dan api-environment.php tidak disertakan dalam ZIP awal dan tidak diubah. Jangan hapus file PHP tersebut saat memperbarui VPS.

Untuk pembaruan tampilan cukup mengganti index.html, style.css, app.js setelah backup file lama. Logo tetap sama. Belum ada perubahan VPS otomatis.

## Revisi UI: notifikasi, profil, keterbacaan, dan waktu
- Lonceng membuka panel contoh alert; klik menuju sapi/lingkungan. Klik luar/Esc menutup panel.
- Profil pengunjung dan akses Pengaturan dinonaktifkan pada UI. Ini bukan autentikasi/otorisasi server; perlu backend untuk admin sungguhan.
- Tidak ada perubahan Node-RED/MySQL/PHP atau URL API. Polling kedua API tetap 5000 ms.
- Jam perangkat terpisah dari recorded_at API. Timestamp SQL tanpa zona diasumsikan WIB.
- Batas kesegaran tampilan sementara DATA_FRESHNESS_MS=120000 (2 menit), perlu disesuaikan dengan interval kirim alat nanti. API gagal ditampilkan sebagai masalah koneksi, bukan bukti alat mati.
- Tanpa data, nilai kesehatan/baterai/ruminasi ditampilkan kosong; grafik ringkasan, alert, dan tren contoh diberi label.
- Status lingkungan memerlukan recorded_at dari API; jika tidak tersedia, online tidak dapat dikonfirmasi.
- Ganti hanya index.html, style.css, app.js. Pertahankan dua file PHP API pada VPS.

## Revisi urutan ringkasan dan HP
Urutan: Critical, Warning, Normal, Total Sapi, Perangkat, Kondisi Fan.
Kartu Perangkat menghitung 10 wearable + 1 sensor lingkungan (11); fan belum dihitung sebagai node terpisah karena arsitekturnya belum ditentukan.
Label kegagalan API: Offline. Console tetap menyimpan detail error teknis.
Fan hanya indikator, tanpa tombol kontrol. Membaca field opsional fan_status (ON/OFF, boolean, atau 1/0) dari respons lingkungan yang sama. Jika belum tersedia, tampil — / Belum ada data; bukan OFF palsu. Tidak mengubah PHP atau protokol alat.
Logo hanya PLN, diperbesar lewat CSS tanpa mengedit gambar sumber.
Nilai contoh riwayat lingkungan dihapus.
Grid ringkasan 3 kolom desktop, 2 kolom tablet/HP, 1 kolom layar sangat sempit. Dropdown dan menu samping mendukung sentuhan, backdrop, dan Escape.
