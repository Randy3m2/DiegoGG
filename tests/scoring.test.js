'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluateMatch}=require('../api/_lib/scoring');
const {selectRegion,validatePuuid,RiotError}=require('../api/_lib/riot');

function player(i,team,win,bad){
  const p={
    puuid:'mock-'+team+'-'+i,teamId:team,win,teamPosition:['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY'][i],
    riotIdGameName:'Player'+team+i,riotIdTagline:'TEST',championName:'Ahri',championId:103,
    kills:bad?1:7,assists:bad?1:9,deaths:bad?11:2,totalMinionsKilled:bad?50:210,
    neutralMinionsKilled:0,visionScore:bad?1:35,goldEarned:bad?5100:12500,
    totalDamageDealtToChampions:bad?2100:23000,
    firstBloodKill:false,firstBloodAssist:false,items:[3031],
    challenges:{dragonTakedowns:0,baronTakedowns:0}
  };
  return p;
}
function fixture(mapId=11){
  const a=[0,1,2,3,4].map(i=>player(i,100,false,i<=1));
  const b=[0,1,2,3,4].map(i=>player(i,200,true,false));
  return {metadata:{matchId:'LA1_111'},info:{
    queueId:420,mapId,gameMode:'CLASSIC',gameDuration:1800,gameCreation:Date.now(),
    participants:[...a,...b]}};
}
test('multiple underperformers produce a shared verdict',()=>{
  const result=evaluateMatch(fixture(),'mock-100-2');
  assert.equal(result.players.length,10);
  assert.equal(result.focus.name,'Player1002');
  assert.ok(result.verdict.candidates.length>=2);
  assert.equal(result.verdict.kind,'shared');
  assert.equal(result.verdict.candidates.includes('mock-100-2'),false);
});
test('unsupported maps never assign statistical blame',()=>{
  const result=evaluateMatch(fixture(12),'mock-100-2');
  assert.equal(result.supported,false);
  assert.deepEqual(result.verdict.candidates,[]);
});
test('region routing and input validation',()=>{
  assert.equal(selectRegion('la1').cluster,'americas');
  assert.equal(selectRegion('euw1').cluster,'europe');
  assert.throws(()=>selectRegion('wrong'),RiotError);
  assert.throws(()=>validatePuuid('../../escape'),RiotError);
  assert.equal(validatePuuid('a'.repeat(78)).length,78);
});
test('scores remain bounded',()=>{
  const result=evaluateMatch(fixture(),'mock-100-2');
  for(const p of result.players)assert.ok(p.score>=12&&p.score<=99);
});
