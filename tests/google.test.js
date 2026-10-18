import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GoogleDrive} from '../src/sync/google.js';
const state={version:1,folders:[],bookmarks:[]};
function drive(fetcher){const d=new GoogleDrive(()=>{},fetcher);d.token='fake';d.expires=Date.now()+60000;return d;}
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
test('401 clears token; 403/429/500 fail without retries',async()=>{
 for(const status of [401,403,429,500]){let count=0;const d=drive(async()=>{count++;return new Response('{}',{status});});await assert.rejects(d.find());assert.equal(count,1);if(status===401)assert.equal(d.connected,false);}
});
test('find paginates and refuses duplicate files',async()=>{
 let count=0;const d=drive(async()=>new Response(JSON.stringify(++count===1?{files:[{id:'a'}],nextPageToken:'next'}:{files:[{id:'b'}]})));
 await assert.rejects(d.find(),/複数/);assert.equal(count,2);
});
test('invalid and oversized remote JSON cannot be restored',async()=>{
 for(const body of ['{bad','{"version":9}']){const d=drive(async()=>new Response(body));await assert.rejects(d.read({id:'a'}));}
 const d=drive(async()=>new Response('{}',{headers:{'content-length':String(21*1024*1024)}}));await assert.rejects(d.read({id:'a'}),/20MB/);
});
test('create uses appDataFolder, validated JSON and Bearer; replace uses PATCH',async()=>{
 const calls=[];const d=drive(async(url,options)=>{calls.push({url,options});return new Response('{"id":"created"}');});
 await d.create(state);assert.equal(calls[0].options.headers.Authorization,'Bearer fake');const form=calls[0].options.body;assert.deepEqual(JSON.parse(await form.get('metadata').text()).parents,['appDataFolder']);assert.deepEqual(JSON.parse(await form.get('file').text()),state);
 await d.replace({id:'a'},state);assert.equal(calls[1].options.method,'PATCH');assert.deepEqual(JSON.parse(calls[1].options.body),state);
});
test('expired token, offline and network failure reject',async()=>{
 const d=drive(async()=>{throw Error('network');});await assert.rejects(d.find(),/通信/);navigator.onLine=false;await assert.rejects(d.find(),/オフライン/);navigator.onLine=true;d.expires=0;await assert.rejects(d.find(),/期限/);
});
test('GIS handles missing configuration, denied consent, popup cancellation and successful disconnect',async()=>{
 globalThis.window={BOOKMARK_HUB_GOOGLE_CLIENT_ID:'YOUR_CLIENT_ID.apps.googleusercontent.com'};
 const d=new GoogleDrive();assert.throws(()=>d.login(),/クライアントID/);
 window.BOOKMARK_HUB_GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';assert.throws(()=>d.login(),/読み込めません/);
 let handler;globalThis.google=window.google={accounts:{oauth2:{initTokenClient:options=>{handler=options;return {requestAccessToken:()=>{}};},hasGrantedAllScopes:()=>true}}};
 let pending=d.login();handler.callback({error:'access_denied'});await assert.rejects(pending,/許可/);assert.equal(d.connected,false);
 pending=d.login();handler.error_callback({type:'popup_closed'});await assert.rejects(pending,/閉じられ/);
 pending=d.login();handler.callback({access_token:'fake',expires_in:3600});await pending;assert.equal(d.connected,true);d.clear();assert.equal(d.connected,false);
 delete globalThis.google;delete globalThis.window;
});
