<?php
declare(strict_types=1);
// Read-only public environmental history; existing latest-reading API is unchanged.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
date_default_timezone_set('Asia/Jakarta');

function ehReply(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function ehDate($value): ?DateTimeImmutable {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return null;
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $date && $date->format('Y-m-d') === $value ? $date : null;
}
function ehRange(array $params, DateTimeImmutable $now): array {
    $mode = $params['mode'] ?? '24h';
    if ($mode === '24h') {
        $start = $now->modify('-24 hours');
        $end = $now;
    } elseif ($mode === 'dates') {
        $start = ehDate($params['from'] ?? null);
        $lastDay = ehDate($params['to'] ?? null);
        if (!$start || !$lastDay || $start > $lastDay ||
            $start < new DateTimeImmutable('2020-01-01') ||
            $lastDay > $now->setTime(0, 0) || $start->diff($lastDay)->days > 30) {
            throw new InvalidArgumentException('Pilih rentang 1–31 hari, mulai tahun 2020 dan tidak di masa depan.');
        }
        $end = $lastDay->modify('+1 day');
    } else {
        throw new InvalidArgumentException('Pilihan periode tidak valid.');
    }
    $seconds = $end->getTimestamp() - $start->getTimestamp();
    $bucket = $seconds <= 86400 ? 300 : ($seconds <= 7 * 86400 ? 900 : 3600);
    return [$start, $end, $bucket];
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        header('Allow: GET');
        ehReply(['status'=>'error', 'message'=>'Gunakan GET.'], 405);
    }
    $now = new DateTimeImmutable('now');
    [$start, $end, $bucket] = ehRange($_GET, $now);
    if (!is_readable('/etc/smartcattle-web.php')) {
        ehReply(['status'=>'error', 'message'=>'Konfigurasi riwayat belum tersedia.'], 503);
    }
    $cfg = require '/etc/smartcattle-web.php';
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = mysqli_init();
    $db->options(MYSQLI_OPT_CONNECT_TIMEOUT, 5);
    $db->real_connect($cfg['host'], $cfg['username'], $cfg['password'], $cfg['database']);
    $db->set_charset('utf8mb4');
    $db->query("SET time_zone = '+07:00'");
    set_time_limit(10);
    // Bare indexed recorded_at in WHERE; database returns at most 745 aggregated rows.
    $query = $db->prepare('SELECT /*+ MAX_EXECUTION_TIME(2000) */
        FLOOR(UNIX_TIMESTAMP(recorded_at) / ?) * ? AS bucket_start,
        COUNT(*) AS samples,
        AVG(temperature) AS temperature, MIN(temperature) AS temperature_min,
        MAX(temperature) AS temperature_max, COUNT(temperature) AS temperature_count,
        AVG(humidity) AS humidity, MIN(humidity) AS humidity_min,
        MAX(humidity) AS humidity_max, COUNT(humidity) AS humidity_count,
        AVG(ammonia) AS ammonia_ppm, MIN(ammonia) AS ammonia_ppm_min,
        MAX(ammonia) AS ammonia_ppm_max, COUNT(ammonia) AS ammonia_ppm_count
        FROM lingkungan_kandang
        WHERE recorded_at >= ? AND recorded_at < ?
        GROUP BY bucket_start ORDER BY bucket_start ASC');
    $fromSql = $start->format('Y-m-d H:i:s');
    $queryEnd = $end < $now ? $end : $now;
    $toSql = $queryEnd->format('Y-m-d H:i:s');
    $query->bind_param('iiss', $bucket, $bucket, $fromSql, $toSql);
    $query->execute();
    $result = $query->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        foreach ($row as $key => $value) {
            $row[$key] = $value === null ? null :
                (($key === 'bucket_start' || $key === 'samples' || str_ends_with($key, '_count'))
                    ? (int)$value : (float)$value);
        }
        $rows[] = $row;
    }
    $query->close();
    $latest = $db->query('SELECT /*+ MAX_EXECUTION_TIME(2000) */ recorded_at FROM lingkungan_kandang WHERE recorded_at IS NOT NULL ORDER BY recorded_at DESC LIMIT 1')->fetch_assoc();
    $db->close();
    // Short browser cache; no disk cache, service, migration or credential in this file.
    header('Cache-Control: public, max-age=30');
    ehReply([
        'status'=>'success', 'timezone'=>'Asia/Jakarta',
        'start'=>$start->getTimestamp(), 'end'=>$end->getTimestamp(),
        'bucket_seconds'=>$bucket, 'generated_at'=>$now->format(DATE_ATOM),
        'latest_at'=>isset($latest['recorded_at']) ? (new DateTimeImmutable($latest['recorded_at']))->format(DATE_ATOM) : null,
        'rows'=>$rows
    ]);
} catch (InvalidArgumentException $error) {
    ehReply(['status'=>'error', 'message'=>$error->getMessage()], 400);
} catch (Throwable $error) {
    error_log('SmartCattle environment history: '.$error->getMessage());
    ehReply(['status'=>'error', 'message'=>'Riwayat lingkungan belum dapat dimuat. Coba lagi atau hubungi pengelola.'], 503);
}
