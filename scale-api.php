<?php
declare(strict_types=1);
ini_set('display_errors','0');header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
date_default_timezone_set('Asia/Jakarta');
require_once __DIR__.'/backend/scale-domain.php';
function out(array $b,int $code=200): void {http_response_code($code);echo json_encode($b,JSON_THROW_ON_ERROR);exit;}
function sq(mysqli $db,string $sql,array $args=[]): mysqli_stmt {$s=$db->prepare($sql);if($args){$t=str_repeat('s',count($args));$s->bind_param($t,...$args);}$s->execute();return $s;}
try {
 // This route is exclusively for the local Node-RED bridge, never browser clients.
 if(!in_array($_SERVER['REMOTE_ADDR']??'',['127.0.0.1','::1'],true))out(['status'=>'error','message'=>'Forbidden'],403);
 $cfg=require '/etc/smartcattle-web.php';$key=$cfg['scale_bridge_token']??'';
 if(!is_string($key)||strlen($key)<32||!hash_equals($key,$_SERVER['HTTP_X_SCALE_TOKEN']??''))out(['status'=>'error','message'=>'Forbidden'],403);
 mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
 $db=new mysqli($cfg['host'],$cfg['username'],$cfg['password'],$cfg['database']);$db->set_charset('utf8mb4');$db->query("SET time_zone='+07:00'");
 if($_SERVER['REQUEST_METHOD']==='GET'){
  $rows=sq($db,"SELECT id session_id,device_id,kind,cow_id,feed_type,DATE_FORMAT(expires_at,'%Y-%m-%dT%H:%i:%s+07:00') expires_at FROM sc_scale_sessions WHERE state='waiting' AND expires_at>NOW()")->get_result()->fetch_all(MYSQLI_ASSOC);
  out(['status'=>'success','data'=>$rows]);
 }
 if($_SERVER['REQUEST_METHOD']!=='POST')out(['status'=>'error'],405);
 $raw=file_get_contents('php://input',false,null,0,4097);
 if(strlen($raw)>4096)out(['status'=>'error','message'=>'Payload too large'],413);
 $b=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
 if(!is_array($b)||array_is_list($b))out(['status'=>'error'],400);
 $id=$b['session_id']??'';$device=$b['device_id']??'';
 if(!is_string($id)||!preg_match('/^[a-f0-9]{32}$/D',$id)||!is_string($device)||!in_array($device,['scale-weight-01','scale-feed-01'],true))out(['status'=>'error','message'=>'Invalid identity'],400);
 $db->begin_transaction();
 sq($db,'SELECT device_id FROM sc_scale_slots WHERE device_id=? FOR UPDATE',[$device]);
 $s=sq($db,'SELECT *,expires_at>NOW() fresh FROM sc_scale_sessions WHERE id=? AND device_id=? FOR UPDATE',[$id,$device])->get_result()->fetch_assoc();
 if(!$s){$db->rollback();out(['status'=>'error','message'=>'Unknown session'],409);}
 $kg=scStableKg($b,$s['kind']);
 if($s['state']==='completed'){
  if(abs((float)$s['result_kg']-$kg)>0.000001){$db->rollback();out(['status'=>'error','message'=>'Session already completed with different result'],409);}
  $db->commit();out(['status'=>'success','session_id'=>$id,'duplicate'=>true]);
 }
 if($s['state']!=='waiting'||!(int)$s['fresh']){$db->rollback();out(['status'=>'error','message'=>'Session closed or expired'],409);}
 $uid=(int)$s['created_by'];
 if($s['kind']==='weight'){
  sq($db,"INSERT INTO sc_entries(cow_id,recorded_date,weight_kg,source,batch_id,updated_by) VALUES (?,CURDATE(),?,'automatic',?,?)",[$s['cow_id'],$kg,$id,$uid]);
 }else{
  foreach(scAllocations($kg) as $cow=>$share)sq($db,"INSERT INTO sc_entries(cow_id,recorded_date,feed_kg,feed_type,source,batch_id,updated_by) VALUES (?,CURDATE(),?,?,'automatic',?,?)",[$cow,$share,$s['feed_type'],$id,$uid]);
 }
 sq($db,"UPDATE sc_scale_sessions SET state='completed',completed_at=NOW(),result_kg=? WHERE id=?",[$kg,$id]);
 sq($db,'INSERT INTO sc_audit(user_id,action,details) VALUES (?,?,?)',[$uid,'scale_complete',json_encode(['session'=>$id,'device'=>$device,'kg'=>$kg])]);
 $db->commit();out(['status'=>'success','session_id'=>$id,'duplicate'=>false]);
}catch(InvalidArgumentException|JsonException $e){if(isset($db))$db->rollback();out(['status'=>'error','message'=>$e->getMessage()],400);}
catch(Throwable $e){if(isset($db))$db->rollback();error_log('Scale bridge: '.get_class($e).' '.$e->getCode());out(['status'=>'error','message'=>'Scale service unavailable'],503);}
