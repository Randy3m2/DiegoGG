'use strict';
const ROUTES = {
  LA1:'americas',LA2:'americas',NA1:'americas',BR1:'americas',
  EUW1:'europe',EUN1:'europe',TR1:'europe',RU:'europe',
  KR:'asia',JP1:'asia',OC1:'sea',PH2:'sea',SG2:'sea',
  TH2:'sea',TW2:'sea',VN2:'sea'
};
const cache=globalThis.__diegoRiotCache||(globalThis.__diegoRiotCache=new Map());
const pending=globalThis.__diegoRiotPending||(globalThis.__diegoRiotPending=new Map());
class RiotError extends Error {
  constructor(message,status=500,retryAfter=null){super(message);this.status=status;this.retryAfter=retryAfter;}
}
function selectRegion(raw){
  const code=String(raw||'LA1').toUpperCase();
  if(!Object.prototype.hasOwnProperty.call(ROUTES,code))throw new RiotError('Región no válida.',400);
  return {code,platform:code.toLowerCase(),cluster:ROUTES[code]};
}
function validatePuuid(raw){
  const puuid=String(raw||'');
  if(!/^[a-zA-Z0-9_-]{30,100}$/.test(puuid))throw new RiotError('Identificador de jugador no válido.',400);
  return puuid;
}
async function riot(host,path,ttl=90000){
  if(!/^[a-z0-9-]+$/.test(host)||(!Object.keys(ROUTES).map(v=>v.toLowerCase()).includes(host)&&!Object.values(ROUTES).includes(host)))throw new RiotError('Host de Riot no válido.',400);
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))throw new RiotError('Ruta inválida.',400);
  const token=process.env.RIOT_API_KEY;
  if(!token)throw new RiotError('Falta configurar RIOT_API_KEY en Vercel.',503);
  const url='https://'+host+'.api.riotgames.com'+path;
  const cached=cache.get(url);
  if(cached&&cached.until>Date.now())return cached.value;
  if(pending.has(url))return pending.get(url);
  const request=(async()=>{
    let result;
    try{result=await fetch(url,{headers:{'X-Riot-Token':token},signal:AbortSignal.timeout(12000)});}
    catch(e){throw new RiotError('Riot tardó demasiado en responder. Intenta nuevamente.',502);}
    if(!result.ok){
      if(result.status===429)throw new RiotError('Límite de Riot alcanzado. Prueba en un minuto.',429,result.headers.get('retry-after'));
      if(result.status===404)throw new RiotError('Jugador o partida no encontrados.',404);
      if(result.status===401||result.status===403)throw new RiotError('La Riot API Key caducó o no tiene permisos.',503);
      throw new RiotError('Riot API devolvió '+result.status+'.',result.status>=500?502:result.status);
    }
    const value=await result.json();
    if(cache.size>=600){
      for(const [k,v] of cache){if(v.until<Date.now())cache.delete(k);}
      if(cache.size>=600)cache.delete(cache.keys().next().value);
    }
    cache.set(url,{until:Date.now()+ttl,value});
    return value;
  })().finally(()=>pending.delete(url));
  pending.set(url,request);
  return request;
}
function json(res,body,status=200,cacheSeconds=0){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control',cacheSeconds?'public, s-maxage='+cacheSeconds+', stale-while-revalidate=180':'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(body));
}
function fail(res,e){
  if(!(e instanceof RiotError))console.error('DiegoGG error:',e);
  const status=e instanceof RiotError?e.status:500;
  if(e.retryAfter)res.setHeader('Retry-After',String(e.retryAfter));
  json(res,{error:status===500?'Error inesperado del servidor.':e.message},status,0);
}
module.exports={ROUTES,RiotError,selectRegion,validatePuuid,riot,json,fail};
