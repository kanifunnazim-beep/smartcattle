<?php
declare(strict_types=1);
// Read only: a single tag, at most one day of sensor measurements.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function trendReply(int $code, array $data): void {
    http_response_code($code);
    header($code === 200 ? 'Cache-Control: private, max-age=60' : 'Cache-Control: no-store');
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET'); trendReply(405,['status'=>'error']);
}
$cow=$_GET['cow'] ?? '';
if (!is_string($cow) || !preg_match('/\A(?:C00[1-9]|C010)\z/', $cow)) trendReply(400,['status'=>'error']);
try {
    $cfg=require '/etc/smartcattle-web.php';
    mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
    $db=mysqli_init();
    $db->options(MYSQLI_OPT_CONNECT_TIMEOUT, 4);
    $db->real_connect($cfg['host'],$cfg['username'],$cfg['password'],$cfg['database']);
    $db->query("SET time_zone='+07:00'");
    $q=$db->prepare('SELECT /*+ MAX_EXECUTION_TIME(1500) */ recorded_at,heart_rate,body_temperature
        FROM kesehatan_sapi WHERE device_id=? AND recorded_at BETWEEN NOW() - INTERVAL 24 HOUR AND NOW()
        ORDER BY recorded_at DESC, id DESC LIMIT 1440');
    $q->bind_param('s',$cow);$q->execute();
    $rows=array_reverse($q->get_result()->fetch_all(MYSQLI_ASSOC));
    $q->close();$db->close();
    trendReply(200,['status'=>'success','cow'=>$cow,'data'=>$rows]);
} catch(Throwable $e) {trendReply(503,['status'=>'error','message'=>'Riwayat belum tersedia.']);}
