<?php
declare(strict_types=1);
// Public, read-only report summaries. No account or session data is exported.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Asia/Jakarta');
const REPORT_CACHE='/var/cache/smartcattle-reports';
function reportReply(array $payload,int $code=200): void {http_response_code($code);echo json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
function reportFail(string $text,int $code=400): void {reportReply(['status'=>'error','message'=>$text],$code);}
function reportDate($value): ?DateTimeImmutable {
 if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value))return null;
 $d=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
 return $d&&$d->format('Y-m-d')===$value?$d:null;
}
function reportQuery(mysqli $db,string $sql,array $args=[]): array {
 if(microtime(true)-$GLOBALS['reportStarted']>15)throw new RuntimeException('Report time budget exceeded');
 $s=$db->prepare($sql);if($args){$types=str_repeat('s',count($args));$s->bind_param($types,...$args);}$s->execute();
 $result=$s->get_result();$rows=$result->fetch_all(MYSQLI_ASSOC);$result->free();$s->close();return $rows;
}
function cachedReport(string $path,int $ttl): ?array {
 if(!is_file($path))return null;$mtime=filemtime($path);if($mtime===false||time()-$mtime>$ttl)return null;
 $text=file_get_contents($path);if($text===false)return null;
 $v=json_decode($text,true);return is_array($v)&&($v['status']??null)==='success'?$v:null;
}
function deviceState(?string $time,int $freshSeconds,int $now): string {
 if(!$time)return 'Belum ada data';$t=strtotime($time);
 if($t===false||$t>$now+60)return 'Waktu perlu diperiksa';return $now-$t<=$freshSeconds?'Online':'Offline';
}
try {
 if($_SERVER['REQUEST_METHOD']!=='GET')reportFail('Gunakan GET.',405);
 $type=$_GET['type']??'health';$cow=$_GET['cow']??'all';
 if(!is_string($type)||!in_array($type,['health','environment','feed','devices'],true))reportFail('Jenis laporan tidak valid.');
 if(!is_string($cow)||!preg_match('/^(?:all|C00[1-9]|C010)$/D',$cow))reportFail('Pilihan sapi tidak valid.');
 $today=new DateTimeImmutable('today');
 $from=reportDate($_GET['from']??$today->modify('-6 days')->format('Y-m-d'));
 $to=reportDate($_GET['to']??$today->format('Y-m-d'));
 if(!$from||!$to||$from>$to||$to>$today||$from<new DateTimeImmutable('2020-01-01')||$from->diff($to)->days>30)reportFail('Pilih periode 1–31 hari, tidak di masa depan.');
 if($type==='devices'||$type==='environment')$cow='all';
 $params=['type'=>$type,'cow'=>$cow,'from'=>$from->format('Y-m-d'),'to'=>$to->format('Y-m-d')];
 $ttl=$type==='devices'?30:120;
 // Normalize the key: device snapshot is independent of selected dates.
 $key=hash('sha256',json_encode($type==='devices'?['v'=>1,'type'=>$type]:['v'=>1]+$params));
 if(!is_dir(REPORT_CACHE)||!is_writable(REPORT_CACHE))reportFail('Laporan belum disiapkan. Pengelola perlu menyiapkan folder cache.',503);
 $path=REPORT_CACHE.'/'.$key.'.json';
 $hit=cachedReport($path,$ttl);if($hit){$hit['cache_hit']=true;reportReply($hit);}
 // At most one cache miss computes a report at a time across all visitors.
 $lock=fopen(REPORT_CACHE.'/compute.lock','c');
 if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){header('Retry-After: 3');reportFail('Laporan lain sedang disiapkan. Coba lagi dalam beberapa detik.',503);}
 clearstatcache(true,$path);$hit=cachedReport($path,$ttl);if($hit){$hit['cache_hit']=true;reportReply($hit);}
 if(!is_file('/etc/smartcattle-web.php'))reportFail('Konfigurasi laporan belum tersedia.',503);
 $cfg=require '/etc/smartcattle-web.php';
 mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
 $db=new mysqli($cfg['host'],$cfg['username'],$cfg['password'],$cfg['database']);$db->set_charset('utf8mb4');
 $db->query("SET time_zone = '+07:00'");
 $GLOBALS['reportStarted']=microtime(true);set_time_limit(20);
 $start=$from->format('Y-m-d 00:00:00');$end=$to->modify('+1 day')->format('Y-m-d 00:00:00');
 $cows=$cow==='all'?array_map(fn($i)=>sprintf('C%03d',$i),range(1,10)):[$cow];
 $rows=[];$limits=null;$notes=[];
 if($type==='health'){
  $setting=reportQuery($db,'SELECT /*+ MAX_EXECUTION_TIME(2000) */ settings_json FROM sc_settings WHERE id=1');
  $limits=json_decode($setting[0]['settings_json']??'',true,16,JSON_THROW_ON_ERROR);
  foreach(['hrMin','hrMax','hrCriticalLow','hrCriticalHigh','tempMin','tempMax','tempCriticalLow','tempCriticalHigh'] as $k){if(!isset($limits[$k])||!is_numeric($limits[$k])||!is_finite((float)$limits[$k]))throw new RuntimeException('Invalid thresholds');$limits[$k]=(float)$limits[$k];}
  $validHr='heart_rate > 0';$validTemp='body_temperature > 0 AND body_temperature <> 85';
  $critical="(($validHr AND (heart_rate < {$limits['hrCriticalLow']} OR heart_rate >= {$limits['hrCriticalHigh']})) OR ($validTemp AND (body_temperature < {$limits['tempCriticalLow']} OR body_temperature >= {$limits['tempCriticalHigh']})))";
  $outside="(($validHr AND (heart_rate < {$limits['hrMin']} OR heart_rate > {$limits['hrMax']})) OR ($validTemp AND (body_temperature < {$limits['tempMin']} OR body_temperature > {$limits['tempMax']})))";
  foreach($cows as $id){
   // Equality on leading device_id uses the existing (device_id,recorded_at) index.
   $daily=reportQuery($db,"SELECT /*+ MAX_EXECUTION_TIME(2000) */ DATE(recorded_at) day,COUNT(*) samples,
    COUNT(CASE WHEN $validHr THEN 1 END) hr_count,
    AVG(CASE WHEN $validHr THEN heart_rate END) hr_avg,MIN(CASE WHEN $validHr THEN heart_rate END) hr_min,MAX(CASE WHEN $validHr THEN heart_rate END) hr_max,
    COUNT(CASE WHEN $validTemp THEN 1 END) temp_count,
    AVG(CASE WHEN $validTemp THEN body_temperature END) temp_avg,MIN(CASE WHEN $validTemp THEN body_temperature END) temp_min,MAX(CASE WHEN $validTemp THEN body_temperature END) temp_max,
    SUM(CASE WHEN $critical THEN 1 ELSE 0 END) critical_samples,
    SUM(CASE WHEN $critical THEN 0 WHEN $outside THEN 1 ELSE 0 END) warning_samples,
    SUM(CASE WHEN heart_rate IS NULL OR heart_rate=0 OR body_temperature IS NULL OR body_temperature<=0 OR body_temperature=85 THEN 1 ELSE 0 END) sensor_check_samples
    FROM kesehatan_sapi WHERE device_id=? AND recorded_at>=? AND recorded_at<? GROUP BY DATE(recorded_at) ORDER BY day",[$id,$start,$end]);
   $rum=reportQuery($db,"SELECT /*+ MAX_EXECUTION_TIME(2000) */ day,rumination_minutes FROM (
    SELECT DATE(recorded_at) day,rumination_minutes,ROW_NUMBER() OVER (PARTITION BY DATE(recorded_at) ORDER BY recorded_at DESC,id DESC) rn
    FROM kesehatan_sapi WHERE device_id=? AND recorded_at>=? AND recorded_at<?
    AND rumination_date=DATE(recorded_at) AND rumination_minutes BETWEEN 0 AND 1440
    ) r WHERE rn=1",[$id,$start,$end]);
   $rumByDay=array_column($rum,'rumination_minutes','day');
   foreach($daily as $r){$r['device_id']=$id;$r['rumination_minutes']=$rumByDay[$r['day']]??null;$rows[]=$r;}
  }
  usort($rows,fn($a,$b)=>[$a['day'],$a['device_id']]<=>[$b['day'],$b['device_id']]);
  $notes=['Ringkasan hanya mencakup hari dan sapi yang memiliki pembacaan tersimpan. Hari tanpa data tidak dianggap normal atau bernilai nol.',
   'Rata-rata/rentang HR mengecualikan nilai 0 dan kosong. Suhu mengecualikan nilai <=0, 85, dan kosong. Nilai lain yang menyimpang tetap disertakan.',
   'Ruminasi adalah total harian terakhir yang valid, dengan tanggal ruminasi sesuai tanggal pembacaan WIB. Bukan penjumlahan laporan; kelengkapan sehari tidak dijamin.',
   'Warning/Critical dihitung ulang per pembacaan menggunakan ambang saat ringkasan disiapkan, bukan arsip kejadian alert. Periksa sensor dapat bersamaan dengan Warning/Critical.'];
 }elseif($type==='environment'){
  $rows=reportQuery($db,"SELECT /*+ MAX_EXECUTION_TIME(2000) */ DATE(recorded_at) day,COUNT(*) samples,
   COUNT(temperature) temp_count,AVG(temperature) temp_avg,MIN(temperature) temp_min,MAX(temperature) temp_max,
   COUNT(CASE WHEN humidity BETWEEN 0 AND 100 THEN 1 END) humidity_count,
   AVG(CASE WHEN humidity BETWEEN 0 AND 100 THEN humidity END) humidity_avg,MIN(CASE WHEN humidity BETWEEN 0 AND 100 THEN humidity END) humidity_min,MAX(CASE WHEN humidity BETWEEN 0 AND 100 THEN humidity END) humidity_max,
   COUNT(CASE WHEN ammonia>=0 THEN 1 END) nh3_count,AVG(CASE WHEN ammonia>=0 THEN ammonia END) nh3_avg,MIN(CASE WHEN ammonia>=0 THEN ammonia END) nh3_min,MAX(CASE WHEN ammonia>=0 THEN ammonia END) nh3_max
   FROM lingkungan_kandang WHERE recorded_at>=? AND recorded_at<? GROUP BY DATE(recorded_at) ORDER BY day",[$start,$end]);
  $notes=['Gas yang dilaporkan adalah amonia (NH3), bukan metana (CH4).','Nilai kosong tidak dianggap nol. Kelembapan di luar 0–100% dan amonia negatif dikeluarkan dari statistik.','Satu baris mewakili pembacaan tersimpan pada satu hari WIB, bukan jaminan perekaman sepanjang hari.'];
 }elseif($type==='feed'){
  $where=$cow==='all'?'':' AND cow_id=?';$args=[$from->format('Y-m-d'),$to->format('Y-m-d')];if($cow!=='all')$args[]=$cow;
  $rows=reportQuery($db,'SELECT /*+ MAX_EXECUTION_TIME(2000) */ cow_id,recorded_date day,feed_kg,weight_kg FROM sc_records WHERE recorded_date BETWEEN ? AND ?'.$where.' ORDER BY recorded_date,cow_id',$args);
  $notes=['Pakan adalah total pemberian per sapi per tanggal, dalam kg. Bobot adalah hasil penimbangan pada tanggal tersebut.','Nilai kosong berarti belum dicatat; pakan 0 berarti tercatat tidak ada pemberian.','Perubahan bobot memakai penimbangan pertama dan terakhir dalam periode untuk sapi yang sama; minimal dua penimbangan. Identitas akun petugas tidak disertakan.'];
 }else{
  $now=time();
  foreach($cows as $id){$last=reportQuery($db,'SELECT /*+ MAX_EXECUTION_TIME(2000) */ recorded_at FROM kesehatan_sapi WHERE device_id=? AND recorded_at IS NOT NULL ORDER BY recorded_at DESC LIMIT 1',[$id]);$t=$last[0]['recorded_at']??null;
   $rows[]=['name'=>'Sensor Kesehatan '.$id,'last_seen'=>$t,'state'=>deviceState($t,360,$now)];}
  $last=reportQuery($db,'SELECT /*+ MAX_EXECUTION_TIME(2000) */ recorded_at FROM lingkungan_kandang WHERE recorded_at IS NOT NULL ORDER BY recorded_at DESC LIMIT 1');$t=$last[0]['recorded_at']??null;
  $rows[]=['name'=>'Sensor Lingkungan','last_seen'=>$t,'state'=>deviceState($t,120,$now)];
  $notes=['Status merupakan snapshot berdasarkan waktu pembacaan terakhir di database saat ringkasan disiapkan, bukan riwayat koneksi atau bukti alat terhubung langsung.','Batas kesegaran: kesehatan 6 menit, lingkungan 2 menit. Baterai dan uptime tidak dilaporkan karena belum tersedia.'];
 }
 $db->close();
 $payload=['status'=>'success','type'=>$type,'cow'=>$cow,'from'=>$type==='devices'?null:$params['from'],'to'=>$type==='devices'?null:$params['to'],
  'generated_at'=>date(DATE_ATOM),'timezone'=>'Asia/Jakarta','cache_seconds'=>$ttl,'cache_hit'=>false,'data'=>$rows,'thresholds'=>$limits,'notes'=>$notes];
 // Bound disk usage: retain at most 128 summary files, and expire old ones.
 $files=glob(REPORT_CACHE.'/*.json')?:[];usort($files,fn($a,$b)=>(filemtime($a)?:0)<=>(filemtime($b)?:0));
 foreach($files as $i=>$file){if($i<count($files)-126||time()-(filemtime($file)?:0)>3600)unlink($file);}
 $tmp=tempnam(REPORT_CACHE,'summary-');if($tmp===false)throw new RuntimeException('Cache temp failed');
 $json=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
 if(file_put_contents($tmp,$json,LOCK_EX)===false){unlink($tmp);throw new RuntimeException('Cache write failed');}
 chmod($tmp,0640);if(!rename($tmp,$path)){unlink($tmp);throw new RuntimeException('Cache publish failed');}
 flock($lock,LOCK_UN);fclose($lock);reportReply($payload);
}catch(Throwable $e){error_log('SmartCattle report: '.get_class($e).' code '.$e->getCode());reportFail('Laporan belum dapat disiapkan. Periksa konfigurasi atau coba periode lebih pendek.',503);}
