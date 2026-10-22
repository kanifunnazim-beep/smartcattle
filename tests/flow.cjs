const fs=require('fs'),vm=require('vm'),assert=require('assert');
const flow=JSON.parse(fs.readFileSync(__dirname+'/../setup/nodered-scales-v2.json','utf8'));
function call(id,msg){const n=flow.find(n=>n.id===id);const context={msg,Buffer,env:{get:()=> 'x'.repeat(64)},node:{status(){},warn(){}},Date,JSON,Number,Array,Error,String};return vm.runInNewContext('(function(){'+n.func+'})()',context);}
const session='a'.repeat(32),device='scale-feed-01';
const result={session_id:session,device_id:device,stable:true,unit:'kg',weight_kg:100.25};
assert.equal(call('sc-result',{retain:true,payload:result,topic:`smartcattle/scales/${device}/result`}),null);
assert.equal(call('sc-result',{payload:{...result,device_id:'scale-weight-01'},topic:`smartcattle/scales/${device}/result`}),null);
assert.equal(call('sc-result',{payload:{...result,stable:false},topic:`smartcattle/scales/${device}/result`}),null);
const valid=call('sc-result',{payload:JSON.stringify(result),topic:`smartcattle/scales/${device}/result`});assert.equal(valid._scaleSession,session);assert.equal(JSON.parse(valid.payload).weight_kg,100.25);
const commands=call('sc-commands',{statusCode:200,payload:{status:'success',data:[{session_id:session,device_id:device}]}});assert.equal(commands[0][0].retain,false);assert.equal(JSON.parse(commands[0][0].payload).command,'arm');
for(const [code,status] of [[200,'saved'],[409,'rejected'],[503,'retry']]){const ack=call('sc-ack',{_scaleDevice:device,_scaleSession:session,statusCode:code,payload:{status:code===200?'success':'error'}});assert.equal(JSON.parse(ack.payload).status,status);}
for(const n of flow.filter(n=>n.type==='function'))new Function('msg','node','env',n.func);
console.log('PASS: retained ignored, device mismatch rejected, unstable rejected, valid payload forwarded, non-retained command, saved/rejected/retry ACK.');
