<?php
// Loaded only for running_hours; account/session/CSRF helpers come from web-api.php.
if($method==='GET'){
    $page=filter_var($_GET['page']??'1',FILTER_VALIDATE_INT);
    if($page===false||$page<1||$page>100000)fail('Halaman tidak valid.');
    $db->begin_transaction();
    $tot=query($db,'SELECT COUNT(*) AS count,COALESCE(SUM(duration_minutes),0) AS minutes FROM sc_running_hours WHERE deleted=0')->get_result()->fetch_assoc();
    $offset=($page-1)*25;
    $rows=query($db,'SELECT id,recorded_date,duration_minutes,revision FROM sc_running_hours WHERE deleted=0 ORDER BY recorded_date DESC,id DESC LIMIT 25 OFFSET '.$offset)->get_result()->fetch_all(MYSQLI_ASSOC);
    $db->commit();
    reply(['status'=>'success','total_minutes'=>(int)$tot['minutes'],'count'=>(int)$tot['count'],'page'=>$page,'rows'=>$rows]);
}
if(!$user)fail('Silakan login petugas.',401);
if($user['role']!=='petugas')fail('Hanya petugas yang dapat mengubah Running Hour.',403);
$b=body();$uid=(int)$user['id'];
$id=$b['id']??0;$revision=$b['revision']??0;
if(!is_int($id)||$id<0||!is_int($revision)||$revision<0)fail('Identitas catatan tidak valid.');
if($method==='DELETE'){
    if(!$id||!$revision)fail('Pilih catatan yang akan dihapus.');
    $db->begin_transaction();
    $q=query($db,'UPDATE sc_running_hours SET deleted=1,revision=revision+1,updated_by=? WHERE id=? AND revision=? AND deleted=0',[$uid,$id,$revision]);
    if($q->affected_rows!==1){$db->rollback();fail('Catatan telah berubah. Muat ulang riwayat.',409);}
    audit($db,$uid,'running_hour_delete',['id'=>$id]);$db->commit();reply(['status'=>'success']);
}
if($method!=='POST')fail('Metode tidak didukung.',405);
$date=$b['recorded_date']??null;$minutes=$b['duration_minutes']??null;
if(!validDate($date)||$date>'9999-12-31'||$date<'2000-01-01'||$date>date('Y-m-d'))fail('Tanggal harus valid dan tidak melewati hari ini (WIB).');
if(!is_int($minutes)||$minutes<1||$minutes>1440)fail('Durasi harus 1 sampai 1440 menit per catatan.');
$db->begin_transaction();
if($id){
    $q=query($db,'UPDATE sc_running_hours SET recorded_date=?,duration_minutes=?,revision=revision+1,updated_by=? WHERE id=? AND revision=? AND deleted=0',[$date,$minutes,$uid,$id,$revision]);
    if($q->affected_rows!==1){$db->rollback();fail('Catatan telah berubah. Muat ulang riwayat.',409);}
}else{
    $key=$b['request_id']??null;
    if(!is_string($key)||!preg_match('/^[a-f0-9]{32}$/D',$key))fail('Identitas permintaan tidak valid.');
    $q=query($db,'INSERT INTO sc_running_hours(recorded_date,duration_minutes,request_id,updated_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',[$date,$minutes,$key,$uid]);
    $row=query($db,'SELECT id,recorded_date,duration_minutes,revision,deleted FROM sc_running_hours WHERE request_id=? FOR UPDATE',[$key])->get_result()->fetch_assoc();
    if($q->affected_rows!==1){
        if((int)$row['deleted']|| (int)$row['revision']!==1||$row['recorded_date']!==$date||(int)$row['duration_minutes']!==$minutes){$db->rollback();fail('Permintaan ini sudah digunakan. Muat ulang riwayat sebelum membuat catatan baru.',409);}
        $db->commit();reply(['status'=>'success','duplicate'=>true]);
    }
    $id=(int)$row['id'];
}
audit($db,$uid,'running_hour_save',['id'=>$id,'date'=>$date,'minutes'=>$minutes]);
$db->commit();reply(['status'=>'success']);
