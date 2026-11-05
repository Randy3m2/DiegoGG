'use strict';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const div=(a,b)=>b>0?a/b:0;
const round=(x,n=1)=>Number(x.toFixed(n));
const LANERS=['TOP','MIDDLE','BOTTOM'];
const ROLE_NAMES={TOP:'TOP',JUNGLE:'JUNGLE',MIDDLE:'MID',BOTTOM:'ADC',UTILITY:'SUPPORT',UNKNOWN:'FILL'};
function evaluateMatch(raw,focusPuuid){
  const info=raw&&raw.info;
  if(!info||!Array.isArray(info.participants))throw new Error('Invalid match data');
  const duration=info.gameDuration>100000?info.gameDuration/1000:info.gameDuration;
  const mins=Math.max(1,duration/60);
  const supported=info.mapId===11&&([400,420,430,440,490,700].includes(info.queueId)||info.gameMode==='CLASSIC');
  const byTeam={};
  for(const p of info.participants)(byTeam[p.teamId]||(byTeam[p.teamId]=[])).push(p);
  const players=info.participants.map(p=>{
    const team=byTeam[p.teamId]||[];
    const teamKills=team.reduce((a,b)=>a+(b.kills||0),0);
    const teamDamage=team.reduce((a,b)=>a+(b.totalDamageDealtToChampions||0),0);
    const deaths=p.deaths||0, kills=p.kills||0, assists=p.assists||0;
    const kp=Math.round(div(kills+assists,teamKills)*100);
    const damage=p.totalDamageDealtToChampions||0;
    const share=Math.round(div(damage,teamDamage)*100);
    const cs=(p.totalMinionsKilled||0)+(p.neutralMinionsKilled||0);
    const csMin=round(cs/mins);
    const vision=p.visionScore||0;
    const visionMin=round(vision/mins,2);
    const position=p.teamPosition||p.individualPosition||'UNKNOWN';
    const reasons=[];
    let score=70;
    function penalty(points,text,key){score-=points;reasons.push({impact:points,label:text,id:key});}
    const deathRate=deaths/(mins/10);
    if(deaths>=6&&deathRate>2.2)penalty(Math.min(27,Math.round((deathRate-2)*9)),'Murió '+deaths+' veces en '+Math.round(mins)+' minutos','deaths');
    const avgTeamDeaths=team.reduce((s,v)=>s+(v.deaths||0),0)/Math.max(team.length,1);
    if(deaths>=5&&deaths>=avgTeamDeaths+3)penalty(7,'Más muertes que el promedio de su equipo','team-deaths');
    if(teamKills>=8&&kp<28)penalty(position==='UTILITY'?13:15,'Participación baja ('+kp+'% KP)','kp');
    else if(teamKills>=8&&kp>=65)score+=12;
    else if(teamKills>=8&&kp>=50)score+=6;
    if(LANERS.includes(position)){
      if(mins>=16&&csMin<4.1)penalty(11,'Farm bajo: '+csMin+' CS/min','farm');
      else if(csMin>=7.5)score+=9;
      const threshold=position==='BOTTOM'?17:13;
      if(mins>=16&&share<threshold&&teamDamage>=15000)penalty(9,'Solo '+share+'% del daño de su equipo','damage');
      else if(share>=29)score+=8;
    }
    if(position==='UTILITY'){
      if(mins>=17&&visionMin<0.5)penalty(12,'Visión baja: '+visionMin+' por minuto','vision');
      else if(visionMin>=1.3)score+=9;
      if(assists>=12)score+=6;
    }
    if(position==='JUNGLE'){
      const objectives=(p.challenges&&p.challenges.dragonTakedowns||0)+(p.challenges&&p.challenges.baronTakedowns||0);
      if(objectives>0)score+=Math.min(10,3*objectives);
      // No blame for an objective without timeline context or teammate participation.
    }
    if(deaths<=3&&kills+assists>=10)score+=8;
    if(p.firstBloodKill||p.firstBloodAssist)score+=3;
    if(p.win)score+=3;
    score=Math.round(clamp(score,12,99));
    const category=score>=84?'carry':score>=69?'solid':score>=52?'mixed':'struggled';
    return {
      puuid:p.puuid||'',name:p.riotIdGameName||p.summonerName||'Invocador',tag:p.riotIdTagline||'',
      champion:p.championName||'Unknown',championId:p.championId||0,
      teamId:p.teamId,win:!!p.win,role:position,roleLabel:ROLE_NAMES[position]||position,
      kills,deaths,assists,cs,csMin,gold:p.goldEarned||0,damage,dpm:Math.round(damage/mins),
      damageShare:share,kp,vision,visionMin,items:[0,1,2,3,4,5,6].map(i=>p['item'+i]||0),
      score,category,reasons:reasons.sort((a,b)=>b.impact-a.impact)
    };
  });
  const losers=players.filter(p=>!p.win).sort((a,b)=>a.score-b.score);
  const candidates=supported?losers.filter(p=>p.score<54):[];
  const winners=players.filter(p=>p.win).sort((a,b)=>b.score-a.score);
  let kind='outplayed',label='El rival jugó mejor';
  if(!supported){kind='unsupported';label='Modo sin análisis';}
  else if(candidates.length>=3){kind='team-diff';label='TEAM DIFF CERTIFICADO';}
  else if(candidates.length>=2){kind='shared';label='CULPA COMPARTIDA';}
  else if(candidates.length===1){kind='single';label='UN SOSPECHOSO PRINCIPAL';}
  const note=!supported?'Este modo no tiene evaluación automática en la V1.'
    :candidates.length===0?'No hay evidencia estadística suficiente para señalar a un jugador concreto.'
    :candidates.length===1?'Este jugador tuvo señales de bajo rendimiento; no prueba que causara la derrota.'
    :candidates.length+' jugadores mostraron señales de bajo rendimiento. La derrota es multifactorial.';
  return {
    matchId:raw.metadata&&raw.metadata.matchId||'',gameCreation:info.gameCreation||0,
    duration:Math.round(duration),gameVersion:info.gameVersion||'',queueId:info.queueId||0,
    gameMode:info.gameMode||'',supported,players,winningTeam:winners[0]&&winners[0].teamId||null,
    focus:players.find(p=>p.puuid===focusPuuid)||null,
    verdict:{kind,label,note,candidates:candidates.map(p=>p.puuid),mvp:winners[0]&&winners[0].puuid||null}
  };
}
module.exports={evaluateMatch};
