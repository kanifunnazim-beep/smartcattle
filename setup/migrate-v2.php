<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
$c=require '/etc/smartcattle-web.php';
$db=in_array('--admin',$argv,true)?new mysqli('localhost','root','',$c['database']):new mysqli($c['host'],$c['username'],$c['password'],$c['database']);
$db->set_charset('utf8mb4');$db->query("SET time_zone='+07:00'");
try {
 if(!$db->query("SELECT GET_LOCK('smartcattle-migrate-v2',0) l")->fetch_assoc()['l'])throw new RuntimeException('Migrasi lain sedang berjalan.');
 if(!$db->query("SHOW COLUMNS FROM sc_users LIKE 'role'")->num_rows)$db->query("ALTER TABLE sc_users ADD role ENUM('petugas','pln') NOT NULL DEFAULT 'petugas'");
 $sql=file_get_contents(__DIR__.'/schema-v2.sql');
 $db->multi_query($sql);do{if($r=$db->store_result())$r->free();}while($db->more_results()&&$db->next_result());
 $db->begin_transaction();
 $done=$db->query("SELECT name FROM sc_migrations WHERE name='weighing-v2' FOR UPDATE")->num_rows;
 if(!$done){
  // Preserve IDs/revisions and nullable values. Legacy table remains intact.
  $db->query("INSERT INTO sc_entries(id,cow_id,recorded_date,feed_kg,weight_kg,source,revision,updated_by,created_at,updated_at) SELECT id,cow_id,recorded_date,feed_kg,weight_kg,'legacy',revision,updated_by,updated_at,updated_at FROM sc_records");
  $db->query("INSERT INTO sc_migrations(name) VALUES('weighing-v2')");
 }
 $db->commit();echo "Migrasi v2 selesai. Data lama dipertahankan.\n";
}catch(Throwable $e){$db->rollback();fwrite(STDERR,"Migrasi gagal: ".$e->getMessage()."\n");exit(1);}
