<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../backend/scale-domain.php';
function check(bool $b,string $m): void {if(!$b)throw new RuntimeException($m);}
foreach([0.01,1.23,100.25,5000.00] as $total){$a=scAllocations($total);check(count($a)===10,'Ten cows');check(abs(array_sum($a)-$total)<0.000001,'Exact total');check(count(array_unique($a))===1,'Equal distribution');}
check(scCow('C001')&&scCow('C010')&&!scCow('C011')&&!scCow("C001\n"),'Cow identifiers');
check(scFeed('kering')&&!scFeed('other'),'Feed types');
check(scStableKg(['stable'=>true,'unit'=>'kg','weight_kg'=>325.5],'weight')===325.5,'Valid stable kg');
foreach([
 ['stable'=>false,'unit'=>'kg','weight_kg'=>10],
 ['stable'=>true,'unit'=>'g','weight_kg'=>10],
 ['stable'=>true,'unit'=>'kg','weight_kg'=>0],
 ['stable'=>true,'unit'=>'kg','weight_kg'=>2001],
 ['stable'=>true,'unit'=>'kg','weight_kg'=>10.123],
 ['stable'=>true,'unit'=>'kg','weight_kg'=>'10']
] as $b){$rejected=false;try{scStableKg($b,'weight');}catch(InvalidArgumentException $e){$rejected=true;}check($rejected,'Reject invalid result');}
echo "PASS domain: allocation, identifiers, stable results and validation\n";
