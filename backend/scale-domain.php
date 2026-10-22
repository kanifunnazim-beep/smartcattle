<?php
declare(strict_types=1);
function scCow($value): bool {return is_string($value)&&preg_match('/^(?:C00[1-9]|C010)$/D',$value)===1;}
function scFeed($value): bool {return is_string($value)&&in_array($value,['kering','combor','basah'],true);}
function scStableKg(array $b,string $kind): float {
 if(($b['stable']??null)!==true||($b['unit']??null)!=='kg')throw new InvalidArgumentException('Hasil harus stabil dan memakai kg.');
 $v=$b['weight_kg']??null;
 if(!(is_int($v)||is_float($v))||!is_finite((float)$v)||$v<=0||$v>($kind==='feed'?5000:2000)||abs(round($v,2)-$v)>0.000001)throw new InvalidArgumentException('Berat tidak valid; maksimum dua desimal.');
 return (float)$v;
}
function scAllocations(float $total): array {
 // A total in hundredths of kg divides exactly into ten thousandths of kg.
 $perCow=(int)round($total*100)/1000;
 $out=[];for($i=1;$i<=10;$i++)$out[sprintf('C%03d',$i)]=$perCow;return $out;
}
