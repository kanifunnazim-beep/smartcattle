# SmartCattle — revisi timbangan, jenis pakan, dan akun PLN

Paket kandidat implementasi v2.1, 22 Oktober 2026. Dibuat dari ZIP yang diberikan pengguna. Tidak pernah diterapkan atau dihubungkan ke VPS produksi. Commit VPS yang dilaporkan: 5632572; ZIP tidak memiliki metadata Git untuk membuktikan identitas commit.

## Penyesuaian v2.1

Hanya konfigurasi bridge timbangan dan panduan pemasangan yang disesuaikan. Token memakai environment pada tab tambahan; tidak memerlukan restart layanan Node-RED. prepare-bridge.php menghasilkan flow JSON privat untuk diimpor. Aktifkan dengan Modified Flows setelah memastikan hanya tab tambahan yang berubah. Fitur web, skema database, dan API tetap sama dengan kandidat v2.

Flow privat berisi token: jangan kirim ke chat/GitHub atau letakkan di folder web. Paket ini hanya memuat template tanpa token. Jangan gunakan petunjuk EnvironmentFile/restart dari paket kandidat sebelumnya.

## Perilaku

- Panel otomatis di atas formulir manual. Memilih sapi atau jenis pakan langsung membuka sesi. Tidak ada angka live; setelah hasil stabil diterima, muncul kilogram tersimpan. Pilihan dikosongkan kembali agar dapat dipakai lagi.
- Dua timbangan independen: bobot per sapi dan total pakan dibagi sama rata ke 10 sapi. Satu sesi aktif per alat, maksimum 10 menit, dapat dibatalkan. Sesi tetap berjalan bila halaman ditutup; membuka halaman kembali membaca status server.
- Pakan Kering, Combor, Pakan Basah tersedia pada otomatis dan manual. Jenis yang sama boleh diberikan beberapa kali sehari. Setiap pemberian menjadi catatan terpisah. Tidak ada pembatasan tepat tiga kali sehari.
- Fitur Ubah/Hapus tetap per baris sapi. Hapus satu baris tidak menghapus sembilan baris lain dari pemberian yang sama. Untuk membatalkan seluruh pemberian yang salah, hapus sepuluh catatan terkait. Mengubah catatan menjadikannya sumber Manual dan menyimpan data sebelumnya di audit.
- Input manual bukan tambahan otomatis ke catatan yang dipilih: tombol Ubah mengoreksi ID baris yang sama. Tombol Catatan baru membuat baris baru; gunakan Hapus dahulu jika mengganti catatan yang salah dengan baris baru.
- Akun petugas lama mendapat peran petugas. Akun PLN dibuat tersendiri, satu akun bersama, akses seluruh empat laporan. Akun PLN ditolak API pengaturan, pencatatan, dan sesi timbang.
- Monitoring tetap terbuka. Laporan memerlukan sesi login aktif dan peran sah, termasuk akses langsung API atau cache. PDF yang sudah diunduh tidak dapat ditarik kembali saat logout.

## Database

`sc_records` lama dipertahankan utuh sebagai snapshot sebelum revisi. `sc_entries` menjadi sumber baru catatan, grafik, dan laporan pakan/bobot; data lama disalin sekali dengan ID, revisi dan nilai kosong dipertahankan, jenis pakan kosong, sumber legacy.

`sc_scale_slots` digunakan untuk mengunci per timbangan; `sc_scale_sessions` menyimpan sesi dan hasil; `sc_migrations` menandai migrasi agar tidak menyalin ulang. Kolom role ditambahkan ke sc_users. Tabel sensor tidak diubah.

Waktu pencatatan otomatis mengikuti waktu WIB saat hasil tersimpan. Sesi yang melintasi tengah malam masuk tanggal penyimpanan. Urutan timbang pada hari yang sama mengikuti ID catatan. Pengubahan tanggal/angka manual tidak mengubah urutan ID tersebut.

## Isi paket

- File web lengkap dengan perubahan pada index.html, style.css, app.js, petugas.js, reports.js, web-api.php, report-api.php.
- scales.js, scale-api.php dan backend/ untuk sesi, catatan, dan otorisasi laporan.
- setup/migrate-v2.php + schema-v2.sql; create-user.php mendukung peran.
- setup/nodered-scales-v2.json merupakan tab TAMBAHAN, bukan pengganti flow kesehatan/lingkungan/fan.
- setup/PROTOKOL-ESP32.md, setup/PANDUAN-V2.md, tests/.

API sensor api-test.php dan api-environment.php tidak disertakan karena hanya ada di VPS. Jangan menghapus/mengganti keduanya saat unggah. Jangan menimpa folder web dengan operasi yang menghapus file yang tidak ada dalam ZIP.

## Status pengujian dan batas

Lulus pemeriksaan sintaks JavaScript, struktur HTML, unit fungsi Node-RED (retained, identitas, stabilitas, command, ACK), dan pengujian logika UI dengan DOM tiruan (PLN/petugas, tambah/ubah/hapus manual, sesi bobot selesai, sesi pakan/batal).

PHP CLI, MySQL dan executable Chromium tidak tersedia di lingkungan pembuat paket. Karena itu lint PHP, migrasi nyata, transaksi bersamaan, autentikasi HTTP/cache, PDF nyata, dan tampilan browser belum terverifikasi. tests/domain.php serta tests/browser.cjs disertakan tetapi belum berhasil dijalankan di sini; tests/browser.cjs memakai API tiruan dan bukan pengujian backend. Sebelum produksi, wajib lakukan lint dan pengujian integrasi pada lingkungan terpisah sesuai PANDUAN-V2.md. Ini bukan paket yang sudah dinyatakan lolos uji produksi.

Prioritaskan petunjuk PANDUAN-V2.md untuk versi ini; dokumen INSTALL/REVISI lama tetap disertakan sebagai riwayat dan tidak dijalankan ulang.
