<?php
// Must run before reading any report cache or generating a report.
if(empty($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off'){http_response_code(400);echo json_encode(['status'=>'error','message'=>'Gunakan HTTPS.']);exit;}
ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
session_name('smartcattle_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();
function denyReport(): void {http_response_code(401);echo json_encode(['status'=>'error','message'=>'Silakan login untuk mengunduh laporan.']);exit;}
if(!isset($_SESSION['uid'])||time()-(int)($_SESSION['login_at']??0)>28800)denyReport();
try {
 $authCfg=require '/etc/smartcattle-web.php';mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
 $authDb=new mysqli($authCfg['host'],$authCfg['username'],$authCfg['password'],$authCfg['database']);
 $authQ=$authDb->prepare("SELECT id FROM sc_users WHERE id=? AND active=1 AND role IN ('petugas','pln')");
 $authQ->bind_param('i',$_SESSION['uid']);$authQ->execute();$allowed=$authQ->get_result()->num_rows===1;$authDb->close();
 if(!$allowed)denyReport();session_write_close();
}catch(Throwable $e){http_response_code(503);echo json_encode(['status'=>'error','message'=>'Layanan akun belum siap.']);exit;}
