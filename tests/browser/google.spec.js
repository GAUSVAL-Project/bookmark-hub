import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
function respond(r,options){return r.fulfill({headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'},...options});}
const old={version:1,folders:[],bookmarks:[{id:'old',title:'既存データ',url:'https://example.com/',note:'維持',folderId:null,createdAt:'2026-01-01',updatedAt:'2026-01-01'}]};
const remote={version:1,folders:[],bookmarks:[]};
async function setup(page){
 await page.route('**/gsi/client',r=>respond(r,{contentType:'text/javascript',body:`window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:'fake',expires_in:3600})}),hasGrantedAllScopes:()=>true}}};`}));
 await page.route('**/google-config.js',r=>respond(r,{contentType:'text/javascript',body:`window.BOOKMARK_HUB_GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';`}));
 await page.goto('./');await expect(page.locator('#summary')).toContainText('0 件');
 await page.locator('#jsonFile').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(1);
 await page.locator('#googleLogin').click();await expect(page.locator('#googleState')).toContainText('接続中');
}
test('Drive restore cancellation, atomic backup, invalid JSON and 401 preserve local data',async({page})=>{
 await setup(page);let bad=false,unauthorized=false;
 await page.route('https://www.googleapis.com/**',async r=>{
 if(r.request().method()==='OPTIONS')return respond(r,{status:204});const url=new URL(r.request().url());if(unauthorized)return respond(r,{status:401,body:'{}'});
 return respond(r,{contentType:'application/json',body:url.searchParams.get('alt')==='media'?(bad?'{"version":9}':JSON.stringify(remote)):JSON.stringify({files:[{id:'remote'}]})});
 });
 await page.locator('#driveRestore').click();await page.locator('#confirmNo').click();await expect(page.locator('.card')).toHaveCount(1);
 bad=true;await page.locator('#driveRestore').click();await expect(page.locator('#status')).toContainText('処理できません');await expect(page.locator('.card')).toHaveCount(1);
 bad=false;await page.locator('#driveRestore').click();await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(0);
 const downloaded=page.waitForEvent('download');await page.locator('#recovery').click();const d=await downloaded;const fs=await import('node:fs/promises');expect(JSON.parse(await fs.readFile(await d.path(),'utf8'))).toEqual(old);
 await expect(page.locator('#lastSync')).toContainText('最終成功');unauthorized=true;await page.locator('#driveRestore').click();await expect(page.locator('#googleState')).toContainText('未接続');await expect(page.locator('#status')).toContainText('失効');
});
test('Drive overwrite backs up first and stops if backup fails',async({page})=>{
 await setup(page);const calls=[];let failBackup=true;
 await page.route('https://www.googleapis.com/**',async r=>{const req=r.request(),url=new URL(req.url());if(req.method()==='OPTIONS')return respond(r,{status:204});calls.push(req.method());
 if(req.method()==='POST')return respond(r,{status:failBackup?403:200,body:'{"id":"backup"}'});
 if(req.method()==='PATCH')return respond(r,{body:'{}'});
 return respond(r,{contentType:'application/json',body:url.searchParams.get('alt')==='media'?JSON.stringify(remote):'{"files":[{"id":"remote"}]}'});
 });
 await page.locator('#driveUpload').click();await page.locator('#confirmYes').click();await expect(page.locator('#status')).toContainText('権限');expect(calls).not.toContain('PATCH');
 failBackup=false;await page.locator('#driveUpload').click();await page.locator('#confirmYes').click();await expect(page.locator('#status')).toContainText('Driveへ保存しました');expect(calls.slice(-2)).toEqual(['POST','PATCH']);await expect(page.locator('.card')).toHaveCount(1);
});

