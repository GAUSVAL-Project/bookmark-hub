import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('hierarchy create, expand, filter, move, backup, reload and delete on mobile',async({page},testInfo)=>{
 await page.goto('./');await expect(page.locator('#summary')).toContainText('0 件');
 await page.locator('#addFolder').click();await page.locator('#folderName').fill('仕事');await page.locator('#folderForm button[type=submit]').click();
 await page.locator('[data-folder]').filter({hasText:'仕事'}).click();await page.locator('#addChildFolder').click();await page.locator('#folderName').fill('資料');await page.locator('#folderForm button[type=submit]').click();
 await page.locator('[data-folder]').filter({hasText:'資料'}).click();await page.locator('#addChildFolder').click();await page.locator('#folderName').fill('設計');await page.locator('#folderForm button[type=submit]').click();
 await page.locator('[data-folder]').filter({hasText:'設計'}).click();await page.locator('#add').click();await page.locator('#title').fill('設計の参考');await page.locator('#url').fill('https://example.com/design');await page.locator('#bookmarkForm button[type=submit]').click();
 await expect(page.locator('#heading')).toHaveText('仕事 / 資料 / 設計');await page.locator('[data-folder]').filter({hasText:'仕事'}).click();await expect(page.locator('.card')).toHaveCount(1);
 await page.locator('#search').fill('参考');await expect(page.locator('.card')).toHaveCount(1);await page.locator('#search').fill('不一致');await expect(page.locator('.card')).toHaveCount(0);await page.locator('#search').fill('');
 const toggler=page.locator('[data-toggle-folder]').first();await toggler.click();await expect(page.locator('[data-folder]').filter({hasText:'設計'})).toHaveCount(0);await expect(toggler).toHaveAttribute('aria-expanded','false');await toggler.click();await expect(page.locator('[data-folder]').filter({hasText:'設計'})).toBeVisible();
 await page.locator('#renameFolder').click();await expect(page.locator('#parentFolder option')).toHaveCount(1);await page.locator('[data-close=folderDialog]').click();
 await page.locator('[data-folder]').filter({hasText:'設計'}).click();await page.locator('#renameFolder').click();await page.locator('#parentFolder').selectOption('');await page.locator('#folderForm button[type=submit]').click();await expect(page.locator('#heading')).toHaveText('設計');
 const event=page.waitForEvent('download');await page.locator('#backup').click();const file=await event;const saved=JSON.parse(await readFile(await file.path(),'utf8'));expect(saved.version).toBe(2);expect(saved.folders.find(f=>f.name==='資料').parentId).toBe(saved.folders.find(f=>f.name==='仕事').id);
 await page.reload();await expect(page.locator('.card')).toHaveCount(1);await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath('folder-tree-mobile.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('[data-folder]').filter({hasText:'仕事'}).click();await page.locator('#deleteFolder').click();await page.locator('#confirmYes').click();await expect(page.locator('[data-folder]').filter({hasText:'資料'})).toHaveCount(0);await page.locator('[data-folder]').filter({hasText:'設計'}).click();await expect(page.locator('.card')).toHaveCount(1);
 await page.locator('#deleteFolder').click();await page.locator('#confirmYes').click();await page.locator('[data-folder=none]').click();await expect(page.locator('.card')).toHaveCount(1);
});
