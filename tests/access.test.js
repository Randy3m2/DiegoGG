'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {requirePrivateGroup}=require('../api/_lib/auth');
const status=require('../api/status');

function fakeResponse(){
  return {
    statusCode:200, headers:{}, body:null,
    setHeader(name,value){this.headers[name]=value;},
    end(value){this.body=JSON.parse(value);}
  };
}
function withEnv(name,value,fn){
  const old=process.env[name];
  if(value==null)delete process.env[name];
  else process.env[name]=value;
  try{return fn();}
  finally{if(old===undefined)delete process.env[name];else process.env[name]=old;}
}
test('private access code is entirely optional',()=>{
  withEnv('DIEGO_ACCESS_CODE',null,()=>{
    const res=fakeResponse();
    assert.equal(requirePrivateGroup({headers:{}},res),true);
    assert.equal(res.body,null);
  });
});
test('configured access code rejects missing and incorrect codes',()=>{
  withEnv('DIEGO_ACCESS_CODE','private-invite-code',()=>{
    for(const candidate of ['', 'wrong']){
      const res=fakeResponse();
      assert.equal(requirePrivateGroup({headers:{'x-diego-access-code':candidate}},res),false);
      assert.equal(res.statusCode,401);
      assert.equal(res.body.authRequired,true);
    }
  });
});
test('configured access code allows matching invite code',()=>{
  withEnv('DIEGO_ACCESS_CODE','private-invite-code',()=>{
    const res=fakeResponse();
    assert.equal(requirePrivateGroup({headers:{'x-diego-access-code':'private-invite-code'}},res),true);
    assert.equal(res.body,null);
  });
});
test('status requires Riot API Key, not optional group password',()=>{
  withEnv('DIEGO_ACCESS_CODE',null,()=>{
    withEnv('RIOT_API_KEY','dummy-token-for-testing',()=>{
      const res=fakeResponse();
      status({},res);
      assert.equal(res.body.status,'ready');
    });
    withEnv('RIOT_API_KEY',null,()=>{
      const res=fakeResponse();
      status({},res);
      assert.equal(res.body.status,'configuration-required');
    });
  });
});
