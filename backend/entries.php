<?php
// Included only by web-api.php after database/session initialization.
require_once __DIR__.'/scale-domain.php';
if($action==='records'&&$method==='GET'){
 $from=$_GET['from']??date('Y-m-d',strtotime('-27 days'));$to=$_GET['to']??date('Y-m-d');
 if(!validDate($from)||!validDate($to)||$from>$to||strtotime($to)-strtotime($from)>366*86400)fail('Rentang tanggal tidak valid.');
 $rows=query($db,'SELECT id,cow_id,recorded_date,feed_kg,weight_kg,feed_type,source,revision FROM sc_entries WHERE recorded_date BETWEEN ? AND ? ORDER BY recorded_date,id',[$from,$to])->get_result()->fetch_all(MYSQLI_ASSOC);
 $latest=query($db,'SELECT cow_id,recorded_date,weight_kg FROM (SELECT cow_id,recorded_date,weight_kg,ROW_NUMBER() OVER(PARTITION BY cow_id ORDER BY recorded_date DESC,id DESC) rn FROM sc_entries WHERE weight_kg IS NOT NULL) r WHERE rn=1')->get_result()->fetch_all(MYSQLI_ASSOC);
 reply(['status'=>'success','data'=>$rows,'latest_weights'=>$latest,'from'=>$from,'to'=>$to]);
}
if(!in_array($action,['records','scale_sessions'],true))return;
if(!$user)fail('Silakan login petugas.',401);
if($user['role']!=='petugas')fail('Akun PLN hanya dapat membuka laporan.',403);
$uid=(int)$user['id'];
if($action==='records'&&$method==='POST'){
 $b=body();$cow=$b['cow_id']??null;$date=$b['recorded_date']??null;
 if(!scCow($cow)||!validDate($date)||$date<'2020-01-01'||$date>date('Y-m-d'))fail('Sapi atau tanggal tidak valid.');
 $feed=numeric($b['feed_kg']??null,0,500,true);$weight=numeric($b['weight_kg']??null,1,2000,true);
 if($feed===null&&$weight===null)fail('Isi pakan atau bobot.');
 if(($feed!==null&&abs(round($feed,3)-$feed)>0.000001)||($weight!==null&&abs(round($weight,2)-$weight)>0.000001))fail('Pakan maksimum 3 desimal; bobot maksimum 2 desimal.');
 $type=$feed===null?null:($b['feed_type']??null);
 if($feed!==null&&!scFeed($type))fail('Pilih jenis pakan.');
 $id=$b['id']??0;$rev=$b['revision']??0;
 if(!is_int($id)||$id<0||!is_int($rev)||$rev<0)fail('Versi catatan tidak valid.');
 $db->begin_transaction();
 if($id===0){
  // Stable request ID prevents duplicate manual submissions after a lost response.
  $key=$b['request_id']??'';if(!is_string($key)||!preg_match('/^[a-f0-9]{32}$/D',$key))fail('ID permintaan tidak valid.');
  query($db,'SELECT device_id FROM sc_scale_slots WHERE device_id=? FOR UPDATE',['scale-feed-01']);
  $old=query($db,"SELECT id FROM sc_entries WHERE batch_id=? AND source='manual'",[$key])->get_result()->fetch_assoc();
  if($old){$db->commit();reply(['status'=>'success','id'=>(int)$old['id'],'duplicate'=>true]);}
  query($db,"INSERT INTO sc_entries(cow_id,recorded_date,feed_kg,weight_kg,feed_type,source,batch_id,updated_by) VALUES (?,?,?,?,?,'manual',?,?)",[$cow,$date,$feed,$weight,$type,$key,$uid]);$id=$db->insert_id;
 }else{
  $old=query($db,'SELECT * FROM sc_entries WHERE id=? FOR UPDATE',[$id])->get_result()->fetch_assoc();
  if(!$old||(int)$old['revision']!==$rev){$db->rollback();fail('Catatan berubah. Muat ulang daftar lalu pilih Ubah.',409);}
  query($db,"UPDATE sc_entries SET cow_id=?,recorded_date=?,feed_kg=?,weight_kg=?,feed_type=?,source='manual',updated_by=?,revision=revision+1 WHERE id=?",[$cow,$date,$feed,$weight,$type,$uid,$id]);
 }
 audit($db,$uid,'entry_save',['id'=>$id,'before'=>$old??null,'cow'=>$cow,'date'=>$date,'feed'=>$feed,'weight'=>$weight,'feed_type'=>$type]);$db->commit();reply(['status'=>'success','id'=>$id]);
}
if($action==='records'&&$method==='DELETE'){
 $b=body();$db->begin_transaction();$old=query($db,'SELECT * FROM sc_entries WHERE id=? FOR UPDATE',[$b['id']??0])->get_result()->fetch_assoc();
 if(!$old||(int)$old['revision']!==($b['revision']??null)){$db->rollback();fail('Catatan berubah. Muat ulang.',409);}
 query($db,'DELETE FROM sc_entries WHERE id=?',[$old['id']]);audit($db,$uid,'entry_delete',$old);$db->commit();reply(['status'=>'success']);
}
if($action==='scale_sessions'&&$method==='GET'){
 $rows=query($db,"SELECT s.*, CASE WHEN state='waiting' AND expires_at<=NOW() THEN 'expired' ELSE state END effective_state FROM sc_scale_sessions s WHERE s.id=(SELECT x.id FROM sc_scale_sessions x WHERE x.device_id=s.device_id ORDER BY x.seq DESC LIMIT 1) ORDER BY seq DESC")->get_result()->fetch_all(MYSQLI_ASSOC);
 reply(['status'=>'success','data'=>$rows]);
}
if($action==='scale_sessions'&&$method==='POST'){
 $b=body();$device=$b['device_id']??'';
 if(!is_string($device)||!in_array($device,['scale-weight-01','scale-feed-01'],true))fail('Perangkat tidak valid.');
 $db->begin_transaction();$slot=query($db,'SELECT * FROM sc_scale_slots WHERE device_id=? FOR UPDATE',[$device])->get_result()->fetch_assoc();
 query($db,"UPDATE sc_scale_sessions SET state='expired' WHERE device_id=? AND state='waiting' AND expires_at<=NOW()",[$device]);
 if(($b['operation']??'start')==='cancel'){
  $q=query($db,"UPDATE sc_scale_sessions SET state='cancelled' WHERE id=? AND device_id=? AND state='waiting'",[$b['id']??'',$device]);
  audit($db,$uid,'scale_cancel',['id'=>$b['id']??'','changed'=>$q->affected_rows]);$db->commit();reply(['status'=>'success']);
 }
 $active=query($db,"SELECT id FROM sc_scale_sessions WHERE device_id=? AND state='waiting'",[$device])->get_result()->fetch_assoc();
 if($active){$db->rollback();fail('Timbangan masih memiliki sesi aktif. Tunggu selesai atau batalkan.',409);}
 $kind=$slot['kind'];$cow=$kind==='weight'?($b['cow_id']??null):null;$type=$kind==='feed'?($b['feed_type']??null):null;
 if(($kind==='weight'&&!scCow($cow))||($kind==='feed'&&!scFeed($type))){$db->rollback();fail('Pilih sapi atau jenis pakan.');}
 $id=bin2hex(random_bytes(16));
 query($db,'INSERT INTO sc_scale_sessions(id,device_id,kind,cow_id,feed_type,created_by,expires_at) VALUES (?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE))',[$id,$device,$kind,$cow,$type,$uid]);
 audit($db,$uid,'scale_start',['id'=>$id,'device'=>$device,'cow'=>$cow,'feed_type'=>$type]);$db->commit();reply(['status'=>'success','id'=>$id]);
}
fail('Metode tidak tersedia.',405);
