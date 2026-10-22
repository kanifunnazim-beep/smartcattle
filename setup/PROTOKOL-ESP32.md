# Protokol timbangan SmartCattle v2

Dua perangkat: `scale-weight-01` (bobot sapi) dan `scale-feed-01` (pakan).
Gunakan kredensial MQTT perangkat yang disiapkan pengelola. Token bridge HTTP hanya untuk Node-RED (environment pada tab timbangan); jangan memasukkannya ke ESP.

## Sesi dan topik

ESP subscribe `smartcattle/scales/<device_id>/command` dan `/ack`.
ESP publish `smartcattle/scales/<device_id>/result`, QoS 1, **retain false**.
Node-RED mengirim ulang perintah arm setiap 5 detik selama sesi aktif; ESP HARUS menganggap ID sesi yang sama sebagai satu sesi (tidak memulai ulang pengukuran).

Contoh command:
```json
{"command":"arm","session_id":"0123456789abcdef0123456789abcdef","device_id":"scale-weight-01","kind":"weight","cow_id":"C003","feed_type":null,"unit":"kg","expires_at":"2026-10-22T14:10:00+07:00"}
```
`session_id` dibuat server secara acak; ESP mengembalikan ID itu persis. Jangan membuat ID sendiri atau memakai contoh di atas sebagai ID operasional. Untuk pakan, `kind=feed`, `cow_id=null`, `feed_type=kering|combor|basah`.

Contoh hasil:
```json
{"session_id":"0123456789abcdef0123456789abcdef","device_id":"scale-weight-01","stable":true,"unit":"kg","weight_kg":325.5}
```
Untuk pakan, `weight_kg` adalah TOTAL seluruh pakan, belum dibagi 10. Backend membaginya ke C001–C010. Total menerima paling banyak 2 desimal; bagian per sapi disimpan sampai 3 desimal agar penjumlahan tetap sama. Misal 100.25 kg -> 10.025 kg/sapi.

ESP harus menentukan stabilitas dari sensor asli setelah kalibrasi dan tare. Parameter toleransi, durasi stabil, dan deteksi beban belum ditentukan karena alat belum tersedia. Jangan mengirim `stable:true` setiap loop. Tunggu beban yang sah setelah sesi dimulai; jangan menggunakan sampel lama yang diambil sebelum command. Berat harus positif; nol/tare bukan hasil timbang.

Server menerima bobot sapi maksimal 2000 kg, total pakan maksimal 5000 kg. Ini batas aplikasi yang perlu dicocokkan dengan kapasitas alat nanti, bukan spesifikasi sensor.

ACK:
```json
{"session_id":"0123456789abcdef0123456789abcdef","status":"saved","duplicate":false,"message":"Tersimpan"}
```
- `saved`: selesai; jangan ukur ulang sesi itu. ACK `duplicate:true` juga berarti sudah tersimpan.
- `retry`: ulangi payload yang SAMA (ID sesi dan berat sama) dengan jeda, misalnya 5 detik. Simpan payload pending sampai ACK diterima. Jangan mengganti berat pada retry.
- `rejected`: sesi sudah ditutup/kedaluwarsa atau data tidak sah. Hentikan retry, tunggu sesi baru.
- Tidak ada ACK (koneksi putus): ulangi payload yang sama secara terbatas sampai ACK atau kedaluwarsa. Hasil terlambat dari sesi batal/expired ditolak.

Sesi berakhir setelah satu hasil disimpan, dibatalkan operator, atau melewati 10 menit. Batal tidak mengirim command khusus ke ESP; backend menolak hasilnya dan ESP menghentikan sesi saat batas waktu. ESP perlu sinkronisasi waktu NTP untuk membaca expiry. Setelah reboot, jangan mengirim ulang hasil lama sebagai hasil untuk ID sesi baru.

Backend menyimpan sesi selesai sehingga pengiriman ulang tidak menciptakan baris tambahan. Sepuluh baris pakan dan penutupan sesi berada dalam satu transaksi. Satu sesi aktif diperbolehkan per timbangan, termasuk jika web dibuka pada beberapa browser.

## Verifikasi tanpa alat (hanya lingkungan uji)

Buat sesi melalui web uji, ambil session_id dari pesan command Node-RED. Gunakan Inject + Function sementara di tab UJI terpisah untuk mengirim contoh payload ke topik result. Jangan memakai Inject pada sistem produksi karena payload valid akan menjadi catatan nyata. Uji kirim dua kali, unstable, sesi salah, device salah, expired, dan cancel. Hapus node uji setelah selesai; tidak ada node simulator yang aktif otomatis dalam paket.
