<?php
// Run only after a backup and approval to configure the bridge.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$path='/etc/smartcattle-web.php';
try{
 $privatePath='/root/smartcattle-scales-private.json';
 if(file_exists($privatePath))throw new RuntimeException('Flow privat sudah ada; tidak ditimpa. Gunakan file tersebut atau periksa dahulu.');
 $flow=json_decode(file_get_contents(__DIR__.'/nodered-scales-v2.json'),true,512,JSON_THROW_ON_ERROR);
 $tabIndex=null;foreach($flow as $i=>$n){if(($n['type']??'')==='tab'&&($n['id']??'')==='sc-scale-v2-tab')$tabIndex=$i;}
 if($tabIndex===null)throw new RuntimeException('Template flow timbangan tidak valid.');
 $c=require $path;if(!is_array($c))throw new RuntimeException('Konfigurasi harus array.');
 if(isset($c['scale_bridge_token'])){
  if(!is_string($c['scale_bridge_token'])||strlen($c['scale_bridge_token'])<32)throw new RuntimeException('Token existing tidak valid; periksa manual.');
 }else{
  $backup=$path.'.before-scales-'.date('Ymd-His');
  if(!copy($path,$backup))throw new RuntimeException('Backup gagal.');chmod($backup,0600);
  $c['scale_bridge_token']=bin2hex(random_bytes(32));
  $tmp=tempnam('/etc','sc-config-');
  if(file_put_contents($tmp,"<?php\nreturn ".var_export($c,true).";\n")===false)throw new RuntimeException('Tulis gagal.');
  chmod($tmp,0640);if(!chgrp($tmp,'www-data'))throw new RuntimeException('Group konfigurasi gagal.');
  if(!rename($tmp,$path))throw new RuntimeException('Simpan konfigurasi gagal.');
 }
 // Flow-scoped environment is loaded by deploying this tab, without restarting Node-RED.
 $flow[$tabIndex]['env']=[['name'=>'SC_SCALE_TOKEN','value'=>$c['scale_bridge_token'],'type'=>'str']];
 $json=json_encode($flow,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
 $previousMask=umask(0077);$h=fopen($privatePath,'x');umask($previousMask);
 if(!$h)throw new RuntimeException('Buat flow privat gagal.');
 $written=fwrite($h,$json);fclose($h);
 if($written!==strlen($json)){unlink($privatePath);throw new RuntimeException('Penulisan flow privat tidak lengkap.');}
 echo "Flow privat siap: /root/smartcattle-scales-private.json\nImport sebagai tab tambahan dengan Deploy Modified Flows. Tidak memerlukan restart layanan Node-RED.\n";
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
