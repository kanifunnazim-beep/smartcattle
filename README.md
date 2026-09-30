# SmartCattle — revisi permintaan client

Perubahan: CCTV (menu, preview, halaman, perangkat kamera) dihapus; aktivitas gerakan/score/diagram dan alert aktivitas dihapus; daftar sapi C001–C010. Ruminasi dipertahankan.

Data contoh: 10 sapi, 6 Normal, 3 Warning, 1 Critical; 1 wearable offline. Offline merupakan status perangkat terpisah dari kesehatan sapi. C009/C010 merupakan tambahan data contoh, bukan hasil sensor. Daftar perangkat contoh: 10 wearable dan 1 sensor kandang.

Desain utama dan integrasi API tetap. api-test.php dan api-environment.php tidak disertakan dalam ZIP awal dan tidak diubah. Jangan hapus file PHP tersebut saat memperbarui VPS.

Untuk pembaruan tampilan cukup mengganti index.html, style.css, app.js setelah backup file lama. Logo tetap sama. Belum ada perubahan VPS otomatis.
