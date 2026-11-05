'use strict';
const {riot,selectRegion,RiotError,json,fail}=require('./_lib/riot');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return json(res,{error:'Only GET supported'},405);
  try{
    const region=selectRegion(req.query.region);
    const name=String(req.query.name||'').trim();
    const tag=String(req.query.tag||'').trim().replace(/^#/,'');
    if(!name||!tag||name.length>32||tag.length>12)throw new RiotError('Escribe Riot ID y etiqueta (#TAG).',400);
    const account=await riot(region.cluster,'/riot/account/v1/accounts/by-riot-id/'+encodeURIComponent(name)+'/'+encodeURIComponent(tag),600000);
    const puuid=account.puuid;
    const settled=await Promise.allSettled([
      riot(region.platform,'/lol/summoner/v4/summoners/by-puuid/'+encodeURIComponent(puuid),300000),
      riot(region.platform,'/lol/league/v4/entries/by-puuid/'+encodeURIComponent(puuid),120000)
    ]);
    const profile=settled[0].status==='fulfilled'?settled[0].value:{};
    const ranked=settled[1].status==='fulfilled'?settled[1].value:[];
    if(settled.every(x=>x.status==='rejected')){
      throw settled[0].reason;
    }
    json(res,{region:region.code,puuid,name:account.gameName||name,tag:account.tagLine||tag,
      level:profile.summonerLevel||0,iconId:profile.profileIconId||29,
      ranked:Array.isArray(ranked)?ranked.map(x=>({
        queueType:x.queueType,tier:x.tier,rank:x.rank,lp:x.leaguePoints||0,
        wins:x.wins||0,losses:x.losses||0,winrate:Math.round(100*(x.wins||0)/Math.max(1,(x.wins||0)+(x.losses||0)))
      })):[]},200,45);
  }catch(e){fail(res,e);}
};
