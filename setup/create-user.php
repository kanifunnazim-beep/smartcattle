<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function prompt(string $label, bool $secret = false): string {
    fwrite(STDOUT, $label);
    if ($secret) {
        if (!function_exists('shell_exec') || !stream_isatty(STDIN)) throw new RuntimeException('Jalankan pada terminal interaktif.');
        $mode = trim((string)shell_exec('stty -g'));
        if ($mode === '') throw new RuntimeException('Tidak dapat menyembunyikan password.');
        shell_exec('stty -echo');
        try { $line = fgets(STDIN); } finally { shell_exec('stty ' . escapeshellarg($mode)); fwrite(STDOUT, "\n"); }
    } else { $line = fgets(STDIN); }
    if ($line === false) throw new RuntimeException('Input dibatalkan.');
    return rtrim($line, "\r\n");
}
try {
    $cfg = require '/etc/smartcattle-web.php';
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = new mysqli($cfg['host'],$cfg['username'],$cfg['password'],$cfg['database']);
    $user = strtolower(trim(prompt('Username petugas baru: ')));
    if (!preg_match('/^[a-z0-9_.-]{3,64}$/D',$user)) throw new RuntimeException('Username 3–64 karakter: a-z, 0-9, _, titik, atau minus.');
    $password = prompt('Password (12–72 byte): ',true);
    if (strlen($password)<12 || strlen($password)>72 || str_contains($password,"\0")) throw new RuntimeException('Panjang password harus 12–72 byte.');
    if ($password !== prompt('Ulangi password: ',true)) throw new RuntimeException('Password tidak sama.');
    $hash = password_hash($password,PASSWORD_DEFAULT); unset($password);
    $q=$db->prepare('INSERT INTO sc_users(username,password_hash) VALUES (?,?)');$q->bind_param('ss',$user,$hash);$q->execute();
    echo "Akun dibuat. Login melalui menu Pengaturan pada HTTPS dashboard.\n";
} catch (Throwable $e) { fwrite(STDERR,"Gagal membuat akun. Periksa konfigurasi, tabel, format input, atau username yang sudah ada.\n"); exit(1); }
