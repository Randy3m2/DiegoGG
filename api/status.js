'use strict';
module.exports=function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify({service:'Diego GG',status:process.env.RIOT_API_KEY&&process.env.DIEGO_ACCESS_CODE?'ready':'configuration-required',version:'1.0.0'}));
};
