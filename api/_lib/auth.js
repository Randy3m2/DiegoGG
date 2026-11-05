'use strict';
const crypto=require('node:crypto');
const {json}=require('./riot');
function requirePrivateGroup(req,res){
  const configured=process.env.DIEGO_ACCESS_CODE||'';
  // Access protection is opt-in: unset DIEGO_ACCESS_CODE means no group passcode.
  if(!configured)return true;
  const candidate=String(req.headers['x-diego-access-code']||'');
  const a=Buffer.from(configured,'utf8'),b=Buffer.from(candidate,'utf8');
  if(a.length===0||a.length!==b.length||!crypto.timingSafeEqual(a,b)){
    json(res,{error:'Diego GG es para un grupo privado. Introduce el código de acceso.',authRequired:true},401);
    return false;
  }
  return true;
}
module.exports={requirePrivateGroup};
