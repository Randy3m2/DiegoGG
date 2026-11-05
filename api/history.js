'use strict';
const {riot,selectRegion,validatePuuid,RiotError,json,fail}=require('./_lib/riot');
const {evaluateMatch}=require('./_lib/scoring');
const {requirePrivateGroup}=require('./_lib/auth');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,{error:'Only GET supported'},405);
  if(!requirePrivateGroup(req,res))return;
  try{
    const region=selectRegion(req.query.region);
    const puuid=validatePuuid(req.query.puuid);
    const start=Math.min(50,Math.max(0,parseInt(req.query.start,10)||0));
    const count=Math.min(8,Math.max(1,parseInt(req.query.count,10)||6));
    const ids=await riot(region.cluster,'/lol/match/v5/matches/by-puuid/'+encodeURIComponent(puuid)+'/ids?start='+start+'&count='+count,60000);
    const matches=new Array(ids.length).fill(null);
    let current=0;
    async function worker(){
      while(current<ids.length){
        const idx=current++;
        try{
          const match=await riot(region.cluster,'/lol/match/v5/matches/'+encodeURIComponent(ids[idx]),3600000);
          if(match&&match.info&&match.info.queueId!==0)matches[idx]=evaluateMatch(match,puuid);
        }catch(e){
          if(e instanceof RiotError&&(e.status===429||e.status===503))throw e;
          matches[idx]=null;
        }
      }
    }
    await Promise.all(Array.from({length:Math.min(ids.length,3)},()=>worker()));
    json(res,{matches:matches.filter(Boolean),start,nextStart:start+ids.length,hasMore:ids.length===count},200,30);
  }catch(e){fail(res,e);}
};
