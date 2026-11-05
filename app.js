'use strict';
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n||0).toLocaleString('en-US');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const teams=['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY'];
  const roleLabel={TOP:'TOP',JUNGLE:'JG',MIDDLE:'MID',BOTTOM:'ADC',UTILITY:'SUP'};
  const queueNames={420:'Ranked Solo',440:'Ranked Flex',400:'Normal Draft',430:'Normal Blind',490:'Quickplay',700:'Clash',450:'ARAM'};
  const regionName={LA1:'LAN',LA2:'LAS',NA1:'NA',EUW1:'EUW',EUN1:'EUNE',BR1:'BR',KR:'KR',JP1:'JP',TR1:'TR',OC1:'OCE'};
  const state={demo:true,profile:null,matches:[],nextStart:0,hasMore:false,filter:'all',tab:'overview',expanded:-1,caseExpanded:-1,savage:true,loading:false,version:'16.21.1'};
  // Suggestions are based on previous real searches in this browser and participants
  // from downloaded matches. Riot has no partial-name account search endpoint.
  const RECENTS_KEY='diego-gg-players-v1';
  const knownPlayers=[];
  let suggestionsVisible=false;
  let highlightedSuggestion=-1;
  let currentSuggestions=[];
  function storeKnownPlayers(){
    try{localStorage.setItem(RECENTS_KEY,JSON.stringify(knownPlayers.slice(0,90)));}catch(e){}
  }
  function loadKnownPlayers(){
    try{
      const loaded=JSON.parse(localStorage.getItem(RECENTS_KEY)||'[]');
      if(Array.isArray(loaded))for(const x of loaded.slice(0,90)){
        if(x&&typeof x.name==='string'&&typeof x.tag==='string'&&typeof x.region==='string'
          &&x.name.length<=32&&x.tag.length<=12&&x.name.length>0&&x.tag.length>0)knownPlayers.push(x);
      }
    }catch(e){}
  }
  function rememberPlayer(player,origin){
    if(!player||!player.name||!player.tag||!player.region||origin==='demo')return;
    const name=String(player.name).trim(),tag=String(player.tag).trim().replace(/^#/,'');
    const region=String(player.region).toUpperCase();
    if(!name||!tag||name.length>32||tag.length>12||!regionName[region])return;
    const key=(name+'#'+tag+'@'+region).toLowerCase();
    const at=knownPlayers.findIndex(x=>(x.name+'#'+x.tag+'@'+x.region).toLowerCase()===key);
    if(at!==-1)knownPlayers.splice(at,1);
    knownPlayers.unshift({name,tag,region,origin:origin||'recent'});
    knownPlayers.length=Math.min(knownPlayers.length,90);
    storeKnownPlayers();
  }
  function rememberMatchPlayers(matches,region){
    if(!Array.isArray(matches))return;
    const players=[];
    for(const match of matches)for(const p of (match.players||[])){
      if(p&&p.name&&p.tag)players.push({name:p.name,tag:p.tag,region});
    }
    // Insert oldest first, keeping the most recent participants at the top.
    for(const p of players.slice(0,60).reverse())rememberPlayer(p,'match');
  }
  function hideSuggestions(){
    suggestionsVisible=false;highlightedSuggestion=-1;currentSuggestions=[];
    $('player-suggestions').classList.add('hidden');
    $('riot-id').setAttribute('aria-expanded','false');
    $('riot-id').removeAttribute('aria-activedescendant');
  }
  function showSuggestions(){
    const field=$('riot-id'),query=field.value.trim().toLowerCase();
    currentSuggestions=knownPlayers.filter(p=>
      !query||(p.name+'#'+p.tag).toLowerCase().includes(query)
      ||p.name.toLowerCase().startsWith(query)
    ).sort((a,b)=>{
      const exactRegion=$('region').value;
      return Number(b.region===exactRegion)-Number(a.region===exactRegion);
    }).slice(0,7);
    const panel=$('player-suggestions');
    highlightedSuggestion=-1;
    if(!suggestionsVisible||(!query&&!knownPlayers.length)){hideSuggestions();return;}
    const items=currentSuggestions.map((p,i)=>
      '<button type="button" role="option" aria-selected="false" id="player-option-'+i+'" class="suggestion-option" data-suggestion="'+i+'">'+
      '<span class="suggestion-avatar">♛</span><span class="suggestion-info"><b>'+esc(p.name)+' <span class="muted">#'+esc(p.tag)+'</span></b>'+
      '<small>'+(p.origin==='match'?'Encontrado en partidas':'Búsqueda reciente')+'</small></span>'+
      '<span class="suggestion-source">'+esc(regionName[p.region]||p.region)+'</span></button>'
    ).join('');
    panel.innerHTML='<div class="suggestion-heading">'+(currentSuggestions.length?'Jugadores conocidos':'No hay coincidencias guardadas')+'</div>'+
      (items||'<div class="suggestion-footer">Busca por Nombre#TAG para añadir un jugador al historial de sugerencias.</div>')+
      (items?'<div class="suggestion-footer">↑ ↓ para elegir · Enter para buscar</div>':'');
    panel.classList.remove('hidden');
    field.setAttribute('aria-expanded','true');
  }
  function highlightSuggestion(index){
    if(!currentSuggestions.length)return;
    highlightedSuggestion=(index+currentSuggestions.length)%currentSuggestions.length;
    $('player-suggestions').querySelectorAll('.suggestion-option').forEach((el,i)=>{
      const active=i===highlightedSuggestion;
      el.classList.toggle('active',active);
      el.setAttribute('aria-selected',String(active));
    });
    $('riot-id').setAttribute('aria-activedescendant','player-option-'+highlightedSuggestion);
  }
  function chooseSuggestion(index){
    const choice=currentSuggestions[index];if(!choice)return false;
    $('riot-id').value=choice.name+'#'+choice.tag;
    $('region').value=choice.region;
    hideSuggestions();
    return true;
  }
  loadKnownPlayers();
  const champAlias={Fiddlesticks:'Fiddlesticks',Wukong:'MonkeyKing',Nunu:'Nunu',RenataGlasc:'Renata',BelVeth:'Belveth',KhaZix:'Khazix',ChoGath:'Chogath',KaiSa:'Kaisa',LeBlanc:'Leblanc',VelKoz:'Velkoz',KogMaw:'KogMaw'};
  function patch(m){const v=m&&m.gameVersion;if(v){const p=v.split('.');if(p.length>=2)return p[0]+'.'+p[1]+'.1';}return state.version;}
  function championImage(champion,match){
    const name=champAlias[champion]||champion||'Unknown';
    return 'https://ddragon.leagueoflegends.com/cdn/'+encodeURIComponent(patch(match))+'/img/champion/'+encodeURIComponent(name)+'.png';
  }
  function profileImage(icon){return 'https://ddragon.leagueoflegends.com/cdn/'+state.version+'/img/profileicon/'+Number(icon||29)+'.png';}
  function imageTag(src,cls,alt){return '<img class="'+esc(cls)+'" src="'+esc(src)+'" alt="'+esc(alt||'')+'" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/favicon.svg\'">';}
  function winRate(wins,total){return total?Math.round(100*wins/total):0;}
  function own(m){return m.focus||m.players.find(x=>x.puuid===state.profile.puuid)||null;}
  function when(ms){try{return new Date(ms).toLocaleDateString('es-DO',{month:'short',day:'numeric'});}catch(e){return '--';}}
  function duration(sec){return Math.floor(sec/60)+':'+String(Math.round(sec%60)).padStart(2,'0');}
  function showMessage(message){
    const el=$('toast');el.textContent=message;el.classList.remove('hidden');
    clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>el.classList.add('hidden'),4000);
  }
  function setBanner(message,show){$('banner').textContent=message;$('banner').classList.toggle('hidden',!show);}
  function setLoading(active,msg){
    state.loading=!!active;$('loading').classList.toggle('hidden',!active);
    $('loading-text').textContent=msg||'Escaneando la Grieta...';
    $('search-btn').disabled=!!active;$('refresh-btn').disabled=!!active;
  }
  async function fetchJSON(url,retried=false){
    const headers={Accept:'application/json'};
    try{
      const code=sessionStorage.getItem('diego-access-code');
      if(code&&url.startsWith('/api/')&&url!=='/api/status')headers['x-diego-access-code']=code;
    }catch(e){}
    const response=await fetch(url,{headers});
    let body={};try{body=await response.json();}catch(e){}
    if(response.status===401&&body.authRequired&&!retried){
      const code=window.prompt('👑 Diego GG es privado. Introduce el código de acceso de tu grupo:');
      if(code&&code.trim()){
        try{sessionStorage.setItem('diego-access-code',code.trim());}catch(e){}
        return fetchJSON(url,true);
      }
    }
    if(!response.ok)throw new Error(body.error||'Error HTTP '+response.status);
    return body;
  }
  async function scan(){
    if(state.loading)return;
    const input=$('riot-id').value.trim();
    const index=input.lastIndexOf('#');
    if(index<1||index===input.length-1){showMessage('Introduce el Riot ID completo: Nombre#TAG');return;}
    const name=input.slice(0,index).trim(),tag=input.slice(index+1).trim();
    const region=$('region').value;
    if(!name||!tag){showMessage('Necesitas el nombre y el #TAG.');return;}
    hideSuggestions();
    setLoading(true,'Buscando cuenta y ranking en Riot...');
    setBanner('',false);
    try{
      const player=await fetchJSON('/api/player?region='+encodeURIComponent(region)+'&name='+encodeURIComponent(name)+'&tag='+encodeURIComponent(tag));
      state.profile=player;
      rememberPlayer(player,'recent');
      state.demo=false;state.matches=[];state.nextStart=0;state.hasMore=false;state.expanded=-1;
      history.replaceState(null,'','/?name='+encodeURIComponent(name)+'&tag='+encodeURIComponent(tag)+'&region='+encodeURIComponent(region));
      setLoading(true,'Analizando los últimos enfrentamientos...');
      const recent=await fetchJSON('/api/history?region='+encodeURIComponent(region)+'&puuid='+encodeURIComponent(player.puuid)+'&count=6');
      state.matches=recent.matches||[];
      rememberMatchPlayers(state.matches,region);
      state.nextStart=recent.nextStart||0;
      state.hasMore=recent.hasMore;
      renderAll();
      $('workspace').scrollIntoView({behavior:'smooth',block:'start'});
      showMessage('¡Scan completado! Se analizaron '+state.matches.length+' partidas.');
    }catch(error){
      setBanner(error.message,true);
      if(state.profile&&!state.demo){renderAll();}
      showMessage(error.message);
    }finally{setLoading(false);}
  }
  async function loadMore(){
    if(state.demo){showMessage('La demo tiene seis partidas ficticias. Busca un Riot ID para consultar más.');return;}
    if(state.loading||!state.hasMore)return;
    setLoading(true,'Buscando más partidas...');
    try{
      const p=state.profile;
      const more=await fetchJSON('/api/history?region='+encodeURIComponent(p.region)+'&puuid='+encodeURIComponent(p.puuid)+'&start='+state.nextStart+'&count=6');
      const known=new Set(state.matches.map(x=>x.matchId));
      state.matches.push(...(more.matches||[]).filter(m=>!known.has(m.matchId)));
      rememberMatchPlayers(more.matches||[],p.region);
      state.nextStart=more.nextStart;
      state.hasMore=more.hasMore;
      renderAll();
    }catch(e){showMessage(e.message);}finally{setLoading(false);}
  }
  function fakePlayer(name,champ,role,teamId,win,score,k,d,a,i){
    const count=k+a;
    const reasons=score>=54?[]:[
      {label:d+' muertes en una partida',impact:15,id:'deaths'},
      {label:'Participación baja en las peleas',impact:11,id:'kp'},
      {label:'Impacto insuficiente para su rol',impact:8,id:'impact'}
    ];
    return {
      puuid:name==='Diego'?'demo-me':'demo-'+i+'-'+name.replace(/\W/g,''),
      name,tag:name==='Diego'?'GOAT':'GG',champion:champ,championId:i+1,
      teamId,win,role,roleLabel:roleLabel[role],kills:k,deaths:d,assists:a,
      cs:Math.round(146+i*13+(k-d)*5),csMin:Number((4.1+i*.25).toFixed(1)),
      gold:9000+i*820+k*310,damage:14000+i*2100+k*750,
      dpm:480+i*35,damageShare:14+i*2,kp:Math.min(90,30+count*3),vision:11+i*4,
      visionMin:Number((.4+i*.13).toFixed(2)),items:[3031,3006,3085,3094,3139,3026,0],
      score,category:score>=84?'carry':score>=69?'solid':score>=52?'mixed':'struggled',reasons
    };
  }
  function demoMatch(index,win,champ,k,d,a,badRoles){
    const you=fakePlayer('Diego',champ,'MIDDLE',100,win,win?91:(index===2?48:87),k,d,a,3);
    const allyChamps=['Garen','LeeSin',champ,'Jinx','Thresh'];
    const enemyChamps=['Darius','Vi','Ahri','Caitlyn','Nautilus'];
    const allyNames=['TorreSinMapa','SmiteOrDie','Diego','ADCenTerapia','HookMachine'];
    const enemyNames=['LaneKing','CrabLover','MidGap','PewPew','VisionLord'];
    const ally=teams.map((role,i)=>{
      if(i===2)return you;
      const bad=badRoles.includes(i);
      return fakePlayer(allyNames[i],allyChamps[i],role,100,win,bad?29+i*4:72+i*3,
        bad?2+i:5+i,bad?8+i:3+i,bad?3+i:7+i,i);
    });
    const enemies=teams.map((role,i)=>fakePlayer(enemyNames[i],enemyChamps[i],role,200,!win,win?40+i*5:75+i*3,
      win?2+i:6+i,win?7+i:3+i,win?4+i:8+i,i+5));
    const players=[...ally,...enemies];
    const losing=players.filter(p=>!p.win);
    const suspects=losing.filter(p=>p.score<54).map(p=>p.puuid);
    const kind=suspects.length>=3?'team-diff':suspects.length>=2?'shared':suspects.length?'single':'outplayed';
    return {
      matchId:'DEMO_'+(10000+index),gameCreation:Date.now()-(index+1)*3600000*7,
      duration:1550+index*140,gameVersion:'16.21.1',queueId:index===4?440:420,gameMode:'CLASSIC',supported:true,
      players,winningTeam:win?100:200,focus:you,
      verdict:{
        kind,label:kind==='team-diff'?'TEAM DIFF CERTIFICADO':kind==='shared'?'CULPA COMPARTIDA':kind==='single'?'UN SOSPECHOSO PRINCIPAL':'El rival jugó mejor',
        note:suspects.length?'Uno o varios jugadores muestran indicadores de bajo rendimiento; no implica causalidad probada.':'No hay una falla individual concluyente.',
        candidates:suspects,mvp:(win?ally:enemies).slice().sort((a,b)=>b.score-a.score)[0].puuid
      }
    };
  }
  function loadDemo(){
    state.profile={puuid:'demo-me',name:'Diego',tag:'GOAT',region:'LA1',level:427,iconId:29,
      ranked:[{queueType:'RANKED_SOLO_5x5',tier:'DIAMOND',rank:'II',lp:76,wins:137,losses:109,winrate:56},
              {queueType:'RANKED_FLEX_SR',tier:'EMERALD',rank:'I',lp:52,wins:59,losses:43,winrate:58}]};
    state.matches=[
      demoMatch(0,false,'Ahri',12,3,9,[0,1,3]),
      demoMatch(1,true,'Syndra',10,2,13,[]),
      demoMatch(2,false,'Yasuo',3,11,5,[0,2,3]),
      demoMatch(3,false,'Ahri',8,3,11,[1,3]),
      demoMatch(4,true,'Lux',7,3,17,[]),
      demoMatch(5,false,'Ahri',11,4,8,[0,1,3,4])
    ];
    state.demo=true;state.hasMore=false;state.nextStart=6;state.expanded=-1;state.caseExpanded=-1;
    setBanner('DEMO · Estos jugadores y resultados son ficticios. Introduce un Riot ID para consultar datos oficiales.',true);
    renderAll();
  }
  function rankImage(tier){
    const ranks=new Set(['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER']);
    const safe=String(tier||'').toUpperCase();
    return ranks.has(safe)
      ?'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-'+safe.toLowerCase()+'.png'
      :'/assets/favicon.svg';
  }
  function rankMarkup(queue){
    if(!queue)return '<div class="empty-rank">Unranked · Sin clasificación registrada.</div>';
    const total=queue.wins+queue.losses;
    const rankText=queue.tier+(queue.rank&&queue.rank!=='I'&&['MASTER','GRANDMASTER','CHALLENGER'].includes(queue.tier)?'':queue.rank?' '+queue.rank:'');
    return '<div class="rank-body"><div class="rank-top"><div class="rank-emblem">'+
      imageTag(rankImage(queue.tier),'',queue.tier+' ranked emblem')+
      '</div><div><b>'+esc(rankText)+'</b><small>'+fmt(queue.lp)+' LP</small></div></div>'+
      '<div class="rank-split"><span>'+fmt(queue.wins)+'W <span class="muted">/</span> '+fmt(queue.losses)+'L</span><strong>'+winRate(queue.wins,total)+'% WR</strong></div>'+
      '<div class="winbar"><i style="width:'+winRate(queue.wins,total)+'%"></i></div></div>';
  }
  function ownMatches(){return state.matches.map(m=>({match:m,player:own(m)})).filter(x=>x.player);}
  function aggregates(){
    const by={};
    for(const {match,player} of ownMatches()){
      const k=player.champion;
      if(!by[k])by[k]={champion:k,matches:0,wins:0,kills:0,deaths:0,assists:0,cs:0,score:0,match};
      const o=by[k];o.matches++;o.wins+=player.win?1:0;
      o.kills+=player.kills;o.deaths+=player.deaths;o.assists+=player.assists;o.cs+=player.cs;o.score+=player.score;
    }
    return Object.values(by).sort((a,b)=>b.matches-a.matches||b.wins-a.wins);
  }
  function renderProfile(){
    const p=state.profile;
    $('profile-avatar').src=profileImage(p.iconId);
    $('profile-avatar').onerror=function(){this.onerror=null;this.src='/assets/favicon.svg';};
    $('level-chip').textContent=p.level?'LV. '+p.level:'LV. --';
    $('player-name').innerHTML=esc(p.name)+' <span>#'+esc(p.tag)+'</span>';
    $('player-subtitle').textContent=(regionName[p.region]||p.region)+' · Summoner Overview · Últimas '+state.matches.length+' partidas';
    $('demo-chip').textContent=state.demo?'DEMO DATA':'LIVE DATA';
    $('update-time').textContent='UPDATED '+new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'});
    $('solo-rank').innerHTML=rankMarkup(p.ranked.find(q=>q.queueType==='RANKED_SOLO_5x5'));
    $('flex-rank').innerHTML=rankMarkup(p.ranked.find(q=>q.queueType==='RANKED_FLEX_SR'));
  }
  function renderTopChampions(){
    const data=aggregates().slice(0,4);
    $('mini-champions').innerHTML=data.length?data.map(c=>'<div class="mini-champ">'+imageTag(championImage(c.champion,c.match),'champ-icon',c.champion)+
      '<div><strong>'+esc(c.champion)+'</strong><small>'+c.matches+' games · '+Math.round(c.kills/c.matches)+'/'+(c.deaths/c.matches).toFixed(1)+'/'+Math.round(c.assists/c.matches)+'</small></div>'+
      '<span class="rate">'+winRate(c.wins,c.matches)+'%</span></div>').join(''):'<div class="muted-empty">Sin partidas registradas.</div>';
  }
  function statCard(label,value,sub,cls){
    return '<div class="stat-tile"><span>'+esc(label)+'</span><b class="'+(cls||'')+'">'+esc(value)+'</b><small>'+esc(sub)+'</small></div>';
  }
  function renderStats(){
    const rows=ownMatches(),matches=rows.length,wins=rows.filter(x=>x.player.win).length;
    const kills=rows.reduce((a,x)=>a+x.player.kills,0),deaths=rows.reduce((a,x)=>a+x.player.deaths,0),assists=rows.reduce((a,x)=>a+x.player.assists,0);
    const score=matches?Math.round(rows.reduce((a,x)=>a+x.player.score,0)/matches):0;
    $('overview-stats').innerHTML=
      statCard('RECENT WIN RATE',winRate(wins,matches)+'%',wins+' wins / '+matches+' games','good')+
      statCard('AVERAGE KDA',((kills+assists)/Math.max(1,deaths)).toFixed(2),matches+' matches analyzed','gold')+
      statCard('PERFORMANCE',score+'/100','Heuristic score','')+
      statCard('AVG KILLS',matches?(kills/matches).toFixed(1):'0','per match','');
  }
  function roast(player){
    if(!player)return 'Sin evidencia suficiente.';
    if(player.score>=84)return state.savage?'Cargando cuatro conos y una torre. El chiropractor está en camino.':'Gran rendimiento: contribución destacada.';
    if(player.score>=69)return 'Cumplió su parte. El Tribunal no tiene cargos.';
    if(player.score>=52)return state.savage?'Partida irregular: hubo gameplay y hubo turismo.':'Rendimiento mixto con oportunidades de mejora.';
    const ids=player.reasons.map(x=>x.id);
    if(ids.includes('deaths'))return state.savage?'El respawn conoce su dirección de memoria.':'Demasiadas muertes para el contexto de la partida.';
    if(ids.includes('vision'))return state.savage?'Jugó con el minimapa en modo decorativo.':'Visión inferior a la esperada para su rol.';
    if(ids.includes('farm'))return state.savage?'Los minions reportaron abandono de labores.':'Necesita mejorar la recolección de súbditos.';
    return state.savage?'Se presentó a la Grieta, pero el impacto llegó tarde.':'Indicadores estadísticos por debajo de lo esperado.';
  }
  function badgeFor(m,player){
    if(!m.supported)return '<span class="match-verdict">NO RATING</span>';
    const accused=!!(m.verdict.candidates||[]).includes(player.puuid);
    if(!player.win&&accused)return '<span class="match-verdict">⚠ '+(player.score<35?'LANE DISASTER':'NEEDS WORK')+'</span>';
    if(!player.win&&m.verdict.kind==='team-diff')return '<span class="match-verdict">⚖ TEAM DIFF</span>';
    if(player.win)return '<span class="match-verdict good">★ VICTORY</span>';
    return '<span class="match-verdict good">♛ '+(player.score>=84?'UNLUCKY CARRY':'NOT GUILTY')+'</span>';
  }
  function matchCard(m,idx){
    const p=own(m);if(!p)return '';
    const win=p.win,score=p.score;
    return '<article class="match-card '+(win?'':'defeat')+'">'+
      '<div class="match-main" data-expand="'+idx+'" role="button" tabindex="0" aria-expanded="'+(idx===state.expanded)+'">'+
        '<div class="match-result"><b>'+(win?'VICTORY':'DEFEAT')+'</b><small>'+(queueNames[m.queueId]||m.gameMode||'Game')+'<br>'+when(m.gameCreation)+'</small></div>'+
        imageTag(championImage(p.champion,m),'champ-photo',p.champion)+
        '<div class="match-data"><strong>'+esc(p.champion)+'</strong><span><span class="kda">'+p.kills+' / '+p.deaths+' / '+p.assists+'</span><br>'+p.kp+'% KP · '+duration(m.duration)+'</span></div>'+
        '<div class="match-metrics"><span>'+fmt(p.cs)+' CS ('+p.csMin+'/min)</span><span>'+fmt(p.damage)+' damage</span></div>'+
        '<div class="match-score"><span class="score-chip '+(score<54?'low':score>=84?'high':'')+'">'+score+'/100</span>'+badgeFor(m,p)+'</div>'+
        '<span class="expand-arrow">'+(state.expanded===idx?'⌃':'⌄')+'</span>'+
      '</div>'+(state.expanded===idx?matchDetails(m):'')+'</article>';
  }
  function findPlayer(m,id){return m.players.find(p=>p.puuid===id);}
  function matchDetails(m){
    const suspects=(m.verdict.candidates||[]).map(id=>findPlayer(m,id)).filter(Boolean);
    const isSupported=m.supported;
    const head='<div class="detail-title"><div><b>⚖ '+esc(m.verdict.label)+'</b><div><small>Match ID: '+esc(m.matchId)+' · '+duration(m.duration)+'</small></div></div><small>'+esc(queueNames[m.queueId]||'SUMMONER\'S RIFT')+'</small></div>';
    const investigation='<div class="investigation"><b>'+(isSupported?'VEREDICTO ESTADÍSTICO':'ANÁLISIS NO DISPONIBLE')+'</b>'+
      '<p>'+esc(m.verdict.note)+'</p><div class="suspects">'+
      (suspects.length?suspects.map(p=>'<span class="suspect">⚠ '+esc(p.name)+' · '+p.score+'/100</span>').join(''):
      '<span class="suspect clear">✓ Sin culpable individual concluyente</span>')+'</div></div>';
    const teamsHtml=[100,200].map(teamId=>{
      const participants=m.players.filter(p=>p.teamId===teamId).sort((a,b)=>teams.indexOf(a.role)-teams.indexOf(b.role));
      if(!participants.length)return '';
      const victory=participants.some(p=>p.win);
      const header='<div class="team-divider">'+(victory?'★ VICTORY':'✕ DEFEAT')+' · '+(teamId===100?'BLUE TEAM':'RED TEAM')+'</div>';
      const rows=participants.map(p=>{
        const culprit=suspects.some(x=>x.puuid===p.puuid),self=p.puuid===state.profile.puuid;
        const why=p.reasons&&p.reasons.length?p.reasons[0].label:roast(p);
        return '<tr><td><div class="player-cell">'+imageTag(championImage(p.champion,m),'',p.champion)+
          '<span class="'+(self?'self':'')+'">'+esc(p.name)+(self?' ★':'')+'<br><span class="muted">'+esc(p.roleLabel||p.role)+'</span></span></div></td>'+
          '<td>'+p.kills+'/'+p.deaths+'/'+p.assists+'</td><td>'+p.kp+'%</td><td>'+fmt(p.damage)+'</td>'+
          '<td class="'+(culprit?'at-risk':p.score>=84?'strong':'')+'">'+p.score+'/100</td>'+
          '<td class="reason">'+esc(why)+'</td></tr>';
      }).join('');
      return header+'<div class="scroll-table"><table class="scoreboard"><thead><tr><th>PLAYER</th><th>K / D / A</th><th>KP</th><th>DAMAGE</th><th>SCORE</th><th>ANALYSIS</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }).join('');
    return '<div class="match-details">'+head+investigation+teamsHtml+'</div>';
  }
  function renderMatches(){
    const filtered=state.matches.map((m,i)=>({m,i})).filter(x=>{
      const p=own(x.m);return p&&(state.filter==='all'||(state.filter==='wins'?p.win:!p.win));
    });
    $('match-list').innerHTML=filtered.length?filtered.map(x=>matchCard(x.m,x.i)).join(''):'<div class="muted-empty">No hay partidas con este filtro.</div>';
    $('load-more').classList.toggle('hidden',!state.hasMore);
  }
  function renderChampions(){
    const list=aggregates();
    $('champion-grid').innerHTML=list.length?list.map(c=>'<div class="champion-card">'+imageTag(championImage(c.champion,c.match),'',c.champion)+
      '<div><h4>'+esc(c.champion)+'</h4><small>'+c.matches+' partidas · '+(c.kills/c.matches).toFixed(1)+'/'+(c.deaths/c.matches).toFixed(1)+'/'+(c.assists/c.matches).toFixed(1)+' KDA</small>'+
      '<strong>'+winRate(c.wins,c.matches)+'% WR</strong><small>Score medio: '+Math.round(c.score/c.matches)+'/100</small></div></div>').join(''):'<div class="muted-empty">Sin datos todavía.</div>';
  }
  function tribunalCounts(){
    const cases=ownMatches().filter(x=>!x.player.win),mine=cases.filter(x=>(x.match.verdict.candidates||[]).includes(x.player.puuid)).length,
      teams=cases.filter(x=>(x.match.verdict.candidates||[]).length>=2).length,
      clean=cases.filter(x=>!(x.match.verdict.candidates||[]).length).length;
    return {cases:cases.length,mine,teams,clean};
  }
  function renderTribunalPreview(){
    const c=tribunalCounts();
    const title=c.cases===0?'NO CASES YET':c.mine===0?'YOU ARE CLEAN':'JUDGE NOT SO FAST';
    $('tribunal-preview').innerHTML='<div class="verdict-preview-content">'+
      '<div class="verdict-big">'+esc(title)+'</div><p>'+
      (c.cases===0?'Juega partidas clasificatorias para tener expedientes.':
        c.mine===0?'En las derrotas recientes, tu rendimiento no figura entre los principales sospechosos.':
        c.mine+' derrota(s) incluyeron tu rendimiento entre las señales de bajo desempeño. Nadie está a salvo aquí.')+
      '</p><div class="tribunal-count"><span>Defeats analyzed</span><b>'+c.cases+'</b></div>'+
      '<div class="tribunal-count"><span>Shared responsibility</span><b>'+c.teams+'</b></div>'+
      '<div class="tribunal-count"><span>Your suspicious games</span><b>'+c.mine+'</b></div></div>';
  }
  function renderPulse(){
    const arr=ownMatches(),n=arr.length||1;
    const score=Math.round(arr.reduce((a,x)=>a+x.player.score,0)/n);
    const kp=Math.round(arr.reduce((a,x)=>a+x.player.kp,0)/n);
    const cs=Math.round(arr.reduce((a,x)=>a+x.player.csMin,0)/n*10);
    const vals=[['Performance score',score,100],['Avg kill participation',kp,100],['Farm efficiency',cs,100]];
    $('player-pulse').innerHTML='<div class="pulse-list">'+vals.map(v=>'<div class="pulse-row"><span>'+v[0]+'</span><strong>'+v[1]+(v[0]==='Farm efficiency'?'':'%')+'</strong></div><div class="pulse-track"><i style="width:'+clamp(v[1],0,100)+'%"></i></div>').join('')+'</div>';
  }
  function renderTribunal(){
    const c=tribunalCounts();
    $('tribunal-stats').innerHTML=
      statCard('DEFEATS REVIEWED',String(c.cases),'recent completed matches','bad')+
      statCard('SHARED BLAME',String(c.teams),'2+ underperformers','gold')+
      statCard('YOU ON TRIAL',String(c.mine),'not proof of intent','bad')+
      statCard('NO CLEAR SUSPECT',String(c.clean),'rival may have outplayed','good');
    const cases=state.matches.map((m,i)=>({m,i})).filter(x=>x.m.supported);
    $('tribunal-cases').innerHTML=cases.length?'<div class="tribunal-cases">'+cases.map(({m,i})=>{
      const p=own(m),count=(m.verdict.candidates||[]).length;
      return '<div class="case-card" data-case="'+i+'" role="button" tabindex="0" aria-expanded="'+(state.caseExpanded===i)+'">'+
        '<div class="case-left"><span class="case-symbol">'+(p&&p.win?'👑':'⚖')+'</span><div><strong>'+esc(m.verdict.label)+'</strong>'+
        '<p>'+esc(p?p.champion:'Unknown')+' · '+when(m.gameCreation)+' · '+count+' sospechoso(s)</p></div></div>'+
        '<div class="case-right">'+(p&&p.win?'VICTORY':'DEFEAT')+' '+(state.caseExpanded===i?'⌃':'⌄')+'</div></div>'+
        (state.caseExpanded===i?'<div class="case-body">'+matchDetails(m)+'</div>':'');
    }).join('')+'</div>':'<div class="muted-empty">No hay expedientes disponibles.</div>';
  }
  function renderAll(){
    if(!state.profile)return;
    $('workspace').classList.remove('hidden');
    renderProfile();renderTopChampions();renderStats();renderMatches();renderChampions();
    renderTribunalPreview();renderPulse();renderTribunal();
  }
  function openTab(which){
    if(!['overview','champions','tribunal'].includes(which))which='overview';
    state.tab=which;
    document.querySelectorAll('[data-tab]').forEach(b=>{
      const active=b.dataset.tab===which;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===which));
    ['overview','champions','tribunal'].forEach(id=>$(id).classList.toggle('hidden',id!==which));
    if(history.replaceState&&state.profile&&!state.demo){
      const u=new URL(location.href);u.hash=which==='overview'?'':which;history.replaceState(null,'',u);
    }
  }
  async function refresh(){
    if(state.demo){loadDemo();showMessage('Demo actualizada.');return;}
    if(!state.profile)return;
    $('riot-id').value=state.profile.name+'#'+state.profile.tag;
    $('region').value=state.profile.region;
    await scan();
  }
  $('riot-id').addEventListener('focus',()=>{
    suggestionsVisible=true;showSuggestions();
  });
  $('riot-id').addEventListener('input',()=>{
    suggestionsVisible=true;showSuggestions();
  });
  $('riot-id').addEventListener('keydown',e=>{
    if(e.key==='Escape'){hideSuggestions();return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(!suggestionsVisible){suggestionsVisible=true;showSuggestions();}
      if(currentSuggestions.length){e.preventDefault();highlightSuggestion(highlightedSuggestion+(e.key==='ArrowDown'?1:-1));}
    }else if(e.key==='Enter'&&highlightedSuggestion>=0){
      e.preventDefault();
      if(chooseSuggestion(highlightedSuggestion))scan();
    }
  });
  $('region').addEventListener('change',()=>{if(suggestionsVisible)showSuggestions();});
  $('player-suggestions').addEventListener('mousedown',e=>e.preventDefault());
  $('player-suggestions').addEventListener('click',e=>{
    const option=e.target.closest('[data-suggestion]');
    if(option&&chooseSuggestion(Number(option.dataset.suggestion)))scan();
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('.search-area'))hideSuggestions();
  });
  $('search-form').addEventListener('submit',e=>{e.preventDefault();scan();});
  $('demo-btn').addEventListener('click',()=>{loadDemo();$('workspace').scrollIntoView({behavior:'smooth'});});
  $('refresh-btn').addEventListener('click',refresh);
  $('reload-btn').addEventListener('click',refresh);
  $('load-more').addEventListener('click',loadMore);
  $('match-filter').addEventListener('change',e=>{state.filter=e.target.value;renderMatches();});
  $('share-btn').addEventListener('click',async()=>{
    const p=state.profile;if(!p)return;
    const link=location.origin+'/?name='+encodeURIComponent(p.name)+'&tag='+encodeURIComponent(p.tag)+'&region='+encodeURIComponent(p.region);
    try{await navigator.clipboard.writeText(link);showMessage('Enlace al perfil copiado.');}
    catch(e){showMessage('Enlace: '+link);}
  });
  $('savage-btn').addEventListener('click',()=>{
    state.savage=!state.savage;
    $('savage-btn').setAttribute('aria-pressed',String(state.savage));
    $('savage-btn').querySelector('span').textContent=state.savage?'Savage ON':'Savage OFF';
    renderMatches();renderTribunal();
    showMessage(state.savage?'😈 Savage Mode activado.':'Modo neutral activado.');
  });
  document.querySelectorAll('[data-tab],[data-nav]').forEach(b=>b.addEventListener('click',e=>{
    e.preventDefault();openTab(b.dataset.tab||b.dataset.nav);$('workspace').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  document.addEventListener('click',e=>{
    const m=e.target.closest('[data-expand]'),c=e.target.closest('[data-case]');
    if(m){const n=Number(m.dataset.expand);state.expanded=state.expanded===n?-1:n;renderMatches();}
    if(c){const n=Number(c.dataset.case);state.caseExpanded=state.caseExpanded===n?-1:n;renderTribunal();}
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-expand],[data-case]')){e.preventDefault();e.target.click();}
  });
  (async()=>{
    try{
      const versions=await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then(r=>r.json());
      if(Array.isArray(versions)&&versions.length)state.version=versions[0];
    }catch(e){}
    const params=new URLSearchParams(location.search);
    if(params.get('name')&&params.get('tag')){
      $('riot-id').value=params.get('name')+'#'+params.get('tag');
      $('region').value=params.get('region')||'LA1';
      scan();
    }else{loadDemo();}
    const hash=location.hash.slice(1);
    if(['overview','champions','tribunal'].includes(hash))openTab(hash);
    try{
      const status=await fetchJSON('/api/status');
      if(status.status==='configuration-required'){
        $('server-pill').innerHTML='<span class="live-dot"></span> API SETUP NEEDED';
      }
    }catch(e){}
  })();
})();
