# SmartCattle Dashboard

Prototype frontend vanilla HTML/CSS/JS.

## Struktur navigasi
- Dashboard = overview saja.
- Monitoring Sapi = daftar sapi dan detail individual yang dipilih.
- Aktivitas & Ruminasi = ringkasan aktivitas.
- Lingkungan Kandang = suhu, kelembapan, NH3.
- CCTV Monitoring = mockup kamera.
- Alert = alert center.
- Perangkat = status device.
- Laporan dan Pengaturan.

## Menjalankan
Bisa langsung buka `index.html`, atau lebih baik jalankan local server:

```bash
python -m http.server 8000
```

lalu buka `http://localhost:8000`.

Data saat ini dummy. Nanti dapat dihubungkan ke Laravel/API, MySQL, Node-RED/MQTT, serta CCTV stream.
