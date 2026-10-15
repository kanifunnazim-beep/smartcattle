<?php
declare(strict_types=1);
// Independent account/settings/feed API. Sensor APIs remain unchanged.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Asia/Jakarta');
function reply(array $data, int $code=200): void { http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit; }
function fail(string $message,int $code=400): void { reply(['status'=>'error','message'=>$message],$code); }
function query(mysqli $db,string $sql,array $args=[]): mysqli_stmt {
    $s=$db->prepare($sql);if($args){$types=str_repeat('s',count($args));$s->bind_param($types,...$args);}$s->execute();return $s;
}
function audit(mysqli $db,int $uid,string $action,array $data): void { query($db,'INSERT INTO sc_audit(user_id,action,details) VALUES (?,?,?)',[$uid,$action,json_encode($data,JSON_THROW_ON_ERROR)]); }
function body(): array {
    if((int)($_SERVER['CONTENT_LENGTH']??0)>8192)fail('Permintaan terlalu besar.',413);
    if(stripos($_SERVER['CONTENT_TYPE']??'','application/json')!==0)fail('Gunakan JSON.',415);
    $raw=file_get_contents('php://input',false,null,0,8193);if(strlen($raw)>8192)fail('Permintaan terlalu besar.',413);
    try {$v=json_decode($raw,true,16,JSON_THROW_ON_ERROR);}catch(Throwable $e){fail('JSON tidak valid.');}
    if(!is_array($v)||array_is_list($v))fail('Objek JSON diperlukan.');return $v;
}
function csrf(): void {
    if(!isset($_SERVER['HTTP_X_CSRF_TOKEN'])||!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']))fail('Sesi berubah. Muat ulang halaman.',403);
}
function validDate($date): bool {
    if(!is_string($date)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$date))return false;
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',$date);return $d&&$d->format('Y-m-d')===$date;
}
function numeric($value,float $min,float $max,bool $nullable=false): ?float {
    if($nullable&&($value===null||$value===''))return null;
    if(!(is_int($value)||is_float($value))||!is_finite((float)$value)||$value<$min||$value>$max)fail('Nilai angka di luar batas.');
    return (float)$value;
}
try {
    if(empty($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off')fail('Gunakan HTTPS.',400);
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
    session_name('smartcattle_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
    session_start();
    if(isset($_SESSION['uid'])&&time()-(int)($_SESSION['login_at']??0)>28800){$_SESSION=[];session_regenerate_id(true);}
    if(empty($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(32));
    $action=$_GET['action']??'session';$method=$_SERVER['REQUEST_METHOD'];
    if(!is_string($action))fail('Aksi tidak valid.');
    if(!in_array($method,['GET','POST','DELETE'],true))fail('Metode tidak didukung.',405);
    if($method!=='GET')csrf();
    if(!is_file('/etc/smartcattle-web.php'))fail('Fitur petugas belum dikonfigurasi di server.',503);
    $cfg=require '/etc/smartcattle-web.php';
    mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
    $db=new mysqli($cfg['host'],$cfg['username'],$cfg['password'],$cfg['database']);$db->set_charset('utf8mb4');
    $user=null;
    if(isset($_SESSION['uid'])){
        $user=query($db,'SELECT id,username FROM sc_users WHERE id=? AND active=1',[$_SESSION['uid']])->get_result()->fetch_assoc();
        if(!$user){unset($_SESSION['uid']);}
    }
    if($action==='session'&&$method==='GET')reply(['status'=>'success','user'=>$user,'csrf'=>$_SESSION['csrf']]);
    if($action==='login'&&$method==='POST'){
        $b=body();$name=$b['username']??'';$pass=$b['password']??'';
        if(!is_string($name)||!is_string($pass)||strlen($name)>64||strlen($pass)>72)fail('Username atau password salah.',401);
        $name=strtolower(trim($name));
        query($db,'DELETE FROM sc_login_attempts WHERE expires_at < ?', [time()-86400]);
        // Separate username and IP windows; clearing cookies cannot reset the limiter.
        $buckets=[hash('sha256','user:'.$name),hash('sha256','ip:'.($_SERVER['REMOTE_ADDR']??''))];
        $db->begin_transaction();$limited=false;
        foreach($buckets as $i=>$key){
            query($db,'INSERT INTO sc_login_attempts(bucket,attempts,expires_at) VALUES (?,0,?) ON DUPLICATE KEY UPDATE bucket=bucket',[$key,time()+900]);
            $row=query($db,'SELECT attempts,expires_at FROM sc_login_attempts WHERE bucket=? FOR UPDATE',[$key])->get_result()->fetch_assoc();
            if((int)$row['expires_at']<=time()){query($db,'UPDATE sc_login_attempts SET attempts=0,expires_at=? WHERE bucket=?',[time()+900,$key]);$row['attempts']=0;}
            if((int)$row['attempts']>=($i===0?10:50))$limited=true;
            query($db,'UPDATE sc_login_attempts SET attempts=attempts+1 WHERE bucket=?',[$key]);
        }$db->commit();
        if($limited){header('Retry-After: 900');fail('Terlalu banyak percobaan. Coba lagi setelah 15 menit.',429);}
        $u=query($db,'SELECT id,username,password_hash FROM sc_users WHERE username=? AND active=1',[$name])->get_result()->fetch_assoc();
        $hash=$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $ok=password_verify($pass,$hash);unset($pass);
        if(!$u||!$ok)fail('Username atau password salah.',401);
        query($db,'DELETE FROM sc_login_attempts WHERE bucket=?',[$buckets[0]]);
        session_regenerate_id(true);$_SESSION['uid']=(int)$u['id'];$_SESSION['login_at']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        reply(['status'=>'success','user'=>['id'=>$u['id'],'username'=>$u['username']],'csrf'=>$_SESSION['csrf']]);
    }
    if($action==='logout'&&$method==='POST'){
        $_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));reply(['status'=>'success','user'=>null,'csrf'=>$_SESSION['csrf']]);
    }
    if($action==='settings'&&$method==='GET'){
        $row=query($db,'SELECT settings_json,revision FROM sc_settings WHERE id=1')->get_result()->fetch_assoc();
        if(!$row)fail('Tabel pengaturan belum disiapkan.',503);
        reply(['status'=>'success','data'=>json_decode($row['settings_json'],true),'revision'=>(int)$row['revision']]);
    }
    if($action==='records'&&$method==='GET'){
        $from=$_GET['from']??date('Y-m-d',strtotime('-27 days'));$to=$_GET['to']??date('Y-m-d');
        if(!validDate($from)||!validDate($to)||$from>$to||strtotime($to)-strtotime($from)>366*86400)fail('Rentang tanggal tidak valid (maksimum 366 hari).');
        $rows=query($db,'SELECT id,cow_id,recorded_date,feed_kg,weight_kg,revision FROM sc_records WHERE recorded_date BETWEEN ? AND ? ORDER BY recorded_date,cow_id',[$from,$to])->get_result()->fetch_all(MYSQLI_ASSOC);
        $latest=query($db,'SELECT r.cow_id,r.recorded_date,r.weight_kg FROM sc_records r JOIN (SELECT cow_id,MAX(recorded_date) d FROM sc_records WHERE weight_kg IS NOT NULL GROUP BY cow_id) x ON r.cow_id=x.cow_id AND r.recorded_date=x.d')->get_result()->fetch_all(MYSQLI_ASSOC);
        reply(['status'=>'success','data'=>$rows,'latest_weights'=>$latest,'from'=>$from,'to'=>$to]);
    }
    // Every mutation below must authenticate, even when invoked outside the UI.
    if(!$user)fail('Silakan login petugas.',401);
    $uid=(int)$user['id'];
    if($action==='settings'&&$method==='POST'){
        $b=body();$v=$b['data']??null;if(!is_array($v))fail('Pengaturan tidak valid.');
        $out=[];
        foreach(['hrMin','hrMax','hrCriticalLow','hrCriticalHigh'] as $k){$out[$k]=numeric($v[$k]??null,1,300);if(floor($out[$k])!==$out[$k])fail('Ambang HR harus bilangan bulat.');}
        foreach(['tempMin','tempMax','tempCriticalLow','tempCriticalHigh'] as $k)$out[$k]=numeric($v[$k]??null,1,60);
        $out['nh3Warning']=numeric($v['nh3Warning']??null,0.01,1000,true);
        foreach(['hr','temp'] as $p)if(!($out[$p.'CriticalLow']<$out[$p.'Min']&&$out[$p.'Min']<$out[$p.'Max']&&$out[$p.'Max']<$out[$p.'CriticalHigh']))fail('Urutan harus: Critical rendah < Normal bawah < Normal atas < Critical tinggi.');
        $db->begin_transaction();$q=query($db,'UPDATE sc_settings SET settings_json=?,revision=revision+1 WHERE id=1 AND revision=?',[json_encode($out),$b['revision']??0]);
        if($q->affected_rows!==1){$db->rollback();fail('Pengaturan telah berubah. Muat ulang sebelum menyimpan.',409);}
        audit($db,$uid,'settings',$out);$db->commit();reply(['status'=>'success','data'=>$out,'revision'=>(int)$b['revision']+1]);
    }
    if($action==='records'&&$method==='POST'){
        $b=body();$cow=$b['cow_id']??'';$date=$b['recorded_date']??'';
        if(!is_string($cow)||!preg_match('/^C00[1-9]$|^C010$/D',$cow))fail('ID sapi tidak valid.');
        if(!validDate($date)||$date<'2020-01-01'||$date>date('Y-m-d'))fail('Tanggal harus valid dan tidak di masa depan.');
        $feed=numeric($b['feed_kg']??null,0,500,true);$weight=numeric($b['weight_kg']??null,1,2000,true);
        if($feed===null&&$weight===null)fail('Isi pakan atau bobot.');
        if(($feed!==null&&abs(round($feed,2)-$feed)>0.000001)||($weight!==null&&abs(round($weight,2)-$weight)>0.000001))fail('Maksimum dua angka desimal.');
        $revision=$b['revision']??0;if(!is_int($revision)||$revision<0)fail('Versi catatan tidak valid.');
        $db->begin_transaction();
        if($revision===0){
            try {query($db,'INSERT INTO sc_records(cow_id,recorded_date,feed_kg,weight_kg,updated_by) VALUES (?,?,?,?,?)',[$cow,$date,$feed,$weight,$uid]);}
            catch(mysqli_sql_exception $e){if($e->getCode()===1062){$db->rollback();fail('Catatan tanggal ini sudah ada. Muat catatan sebelum mengubahnya.',409);}throw $e;}
        }else{
            $q=query($db,'UPDATE sc_records SET feed_kg=?,weight_kg=?,updated_by=?,revision=revision+1 WHERE cow_id=? AND recorded_date=? AND revision=?',[$feed,$weight,$uid,$cow,$date,$revision]);
            if($q->affected_rows!==1){$db->rollback();fail('Catatan sudah berubah atau dihapus. Muat ulang.',409);}
        }
        audit($db,$uid,'record_save',['cow'=>$cow,'date'=>$date,'feed'=>$feed,'weight'=>$weight,'previous_revision'=>$revision]);$db->commit();reply(['status'=>'success']);
    }
    if($action==='records'&&$method==='DELETE'){
        $b=body();$db->begin_transaction();
        $row=query($db,'SELECT * FROM sc_records WHERE id=? FOR UPDATE',[$b['id']??0])->get_result()->fetch_assoc();
        if(!$row||(int)$row['revision']!==($b['revision']??null)){$db->rollback();fail('Catatan sudah berubah. Muat ulang.',409);}
        query($db,'DELETE FROM sc_records WHERE id=?',[$row['id']]);audit($db,$uid,'record_delete',$row);$db->commit();reply(['status'=>'success']);
    }
    fail('Aksi tidak tersedia.',404);
} catch(Throwable $e) {
    if(isset($db)){try{$db->rollback();}catch(Throwable $ignored){}}
    error_log('SmartCattle web API: '.get_class($e).' code '.$e->getCode());
    fail('Layanan belum siap atau terjadi kesalahan server. Periksa konfigurasi dan tabel.',503);
}
