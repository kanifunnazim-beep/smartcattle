/* Display labels only. Keep canonical C001-C010 in API requests and stored data. */
(() => {
 'use strict';
 const labels=Object.freeze({C001:'1437',C002:'2915',C003:'2762',C004:'2778',C005:'2764',C006:'2359',C007:'2885',C008:'2894',C009:'2803',C010:'2881'});
 window.scCowLabel=id=>Object.prototype.hasOwnProperty.call(labels,String(id??''))?labels[id]:String(id??'');
 window.scCowDisplayText=value=>String(value??'').replace(/\bC(?:00[1-9]|010)\b/g,id=>labels[id]);
})();
