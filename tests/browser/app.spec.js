import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('Japanese library: CRUD, folders, persistence, transfer, safety, mobile and offline',async({page,context})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#summary')).toContainText('0 件');
  await page.locator('#addFolder').click();await page.locator('#folderName').fill('仕事');await page.locator('#folderForm button[type=submit]').click();
  await page.locator('#add').click();await page.locator('#title').fill('日本語リンク');await page.locator('#url').fill('https://example.com');await page.locator('#folderSelect').selectOption({label:'仕事'});await page.locator('#note').fill('資料を探す');await page.locator('#bookmarkForm button[type=submit]').click();
  await expect(page.locator('.card')).toHaveCount(1);await page.reload();await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('#search').fill('資料');await expect(page.locator('.card')).toHaveCount(1);await page.locator('#search').fill('ない単語');await expect(page.locator('.card')).toHaveCount(0);await page.locator('#search').fill('');
  await page.locator('[data-edit]').click();await page.locator('#title').fill('更新したリンク');await page.locator('#bookmarkForm button[type=submit]').click();await expect(page.locator('.card h2')).toContainText('更新したリンク');
  const download=page.waitForEvent('download');await page.locator('#backup').click();const file=await download;const backupPath=await file.path();
  await page.locator('#htmlFile').setInputFiles({name:'bookmarks.html',mimeType:'text/html',buffer:Buffer.from('<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><H3>参考</H3><DL><p><DT><A HREF="https://example.org">&lt;img src=x onerror=alert(1)&gt;</A><DT><H3>子</H3><DL><DT><A HREF="https://nested.example/">子のリンク</A></DL></DL><DT><A HREF="javascript:alert(1)">危険</A><DT><A HREF="https://example.com/">重複</A></DL>')});await expect(page.locator('#confirmDialog')).toBeVisible();await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(3);await expect(page.locator('.card img')).toHaveCount(0);await expect(page.locator('#folders')).toContainText('参考 / 子');await expect(page.locator('#status')).toContainText('重複 1 件');
  await page.locator('#jsonFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":9}')});await expect(page.locator('#status')).toContainText('処理できません');await expect(page.locator('.card')).toHaveCount(3);
  await page.locator('#jsonFile').setInputFiles(backupPath);await page.locator('#confirmNo').click();await expect(page.locator('.card')).toHaveCount(3);
  await page.locator('#jsonFile').setInputFiles(backupPath);await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('button',{name:/仕事/}).click();await page.locator('#renameFolder').click();await page.locator('#folderName').fill('業務');await page.locator('#folderForm button[type=submit]').click();await expect(page.locator('#heading')).toHaveText('業務');
  await page.locator('#deleteFolder').click();await page.locator('#confirmYes').click();await page.getByRole('button',{name:/未分類/}).click();await expect(page.locator('.card')).toHaveCount(1);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#add')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('#network')).toContainText('オフライン');await page.locator('[data-edit]').click();await page.locator('#note').fill('オフラインで編集');await page.locator('#bookmarkForm button[type=submit]').click();await page.reload();await expect(page.locator('.note')).toContainText('オフラインで編集');
  await context.setOffline(false);await page.locator('[data-delete]').click();await page.locator('#confirmNo').click();await expect(page.locator('.card')).toHaveCount(1);await page.locator('[data-delete]').click();await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('PWA metadata and responsive sample library',async({page},testInfo)=>{
  await page.goto('./');await expect(page.locator('#summary')).toContainText('0 件');
  await page.locator('#htmlFile').setInputFiles({name:'sample.html',mimeType:'text/html',buffer:await readFile('docs/sample-bookmarks.html')});await page.locator('#confirmYes').click();await expect(page.locator('.card')).toHaveCount(4);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:true});
  await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('#add').click();await expect(page.locator('#title')).toBeVisible();await page.locator('[data-close=editor]').first().click();
  const manifest=await page.evaluate(async()=>await(await fetch(document.querySelector('link[rel=manifest]').href)).json());expect(manifest.display).toBe('standalone');expect(manifest.icons.map(i=>i.sizes)).toContain('512x512');
  for(const icon of manifest.icons){const response=await page.request.get(icon.src);expect(response.ok()).toBeTruthy();expect(response.headers()['content-type']).toContain('image/png');}
});


