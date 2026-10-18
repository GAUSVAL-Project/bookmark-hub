import './style.css';
import {newState,safeUrl,validateState,filterBookmarks,mergeImport} from './model.js';
import {repository} from './storage/indexeddb.js';
import {parseBookmarkHtml,downloadBackup} from './transfer.js';
import {GoogleDrive} from './sync/google.js';

const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=newState(), folder='all', query='', ready=false, busy=false, installPrompt;
document.querySelector('#app').innerHTML=`
<aside><a class="brand" href="./"><span class="brand-icon">▰</span><span>Bookmark Hub<small>あなたのお気に入り、ひとつに。</small></span></a><div class="section-label">ライブラリ</div><nav id="folders" aria-label="フォルダ"></nav><button class="subtle add-folder" id="addFolder">＋ フォルダを作成</button><div id="folderActions"></div><div class="sidebar-foot"><span class="local-dot"></span> この端末に保存<small>Google Driveへ手動バックアップ</small></div></aside>
<main><header><div><span class="eyebrow">MY PERSONAL LIBRARY</span><h1 id="heading">すべてのお気に入り</h1><p id="summary">ライブラリを読み込み中…</p></div><button class="primary" id="add">＋ お気に入りを追加</button></header>
<section class="toolbar" aria-label="検索と並び替え"><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="タイトル・URL・メモを検索" aria-label="お気に入りを検索"></label><select id="sort" aria-label="並び順"><option value="new">新しい順</option><option value="title">タイトル順</option><option value="old">古い順</option></select></section>
<div id="status" role="status" aria-live="polite"></div><section id="cards" class="cards" aria-label="お気に入り一覧"></section>
<section class="data-panel"><div><h2>大切なリンクを、手元に。</h2><p>ブラウザのブックマークを取り込み、JSONでバックアップ。</p></div><div class="data-actions"><button id="htmlImport">HTMLを取り込む</button><button id="backup">JSONを書き出す</button><button id="jsonImport">JSONから復元</button></div></section>
<section class="data-panel"><div><h2>Google Drive バックアップ</h2><p id="googleState" role="status">未接続</p><p id="lastSync">最終同期：未実行</p><p>手動操作で全件を保存・復元します。自動同期・統合は行いません。</p></div><div class="data-actions"><button id="googleLogin">Googleに接続</button><button id="googleLogout" disabled>切断</button><button id="driveUpload" disabled>Driveへ保存</button><button id="driveRestore" disabled>Driveから復元</button><button id="recovery">復元前バックアップを書き出す</button></div></section><footer><span>Bookmark Hub <span class="tag">v0.2</span></span><button class="subtle" id="help">使い方・保存について</button><button id="install" hidden>アプリをインストール</button><span id="network"></span></footer>
<input type="file" id="htmlFile" accept=".html,.htm,text/html" hidden><input type="file" id="jsonFile" accept=".json,application/json" hidden></main>
<dialog id="editor"><form id="bookmarkForm"><div class="dialog-head"><h2 id="editorTitle">お気に入りを追加</h2><button type="button" data-close="editor" aria-label="閉じる">×</button></div><input id="bookmarkId" type="hidden"><label>タイトル<input id="title" required maxlength="300" autocomplete="off"></label><label>URL<input id="url" type="url" required maxlength="8000" placeholder="https://example.com" inputmode="url"></label><label>フォルダ<select id="folderSelect"></select></label><label>メモ<textarea id="note" maxlength="3000" rows="3" placeholder="あとで見つけやすいように、ひとこと。"></textarea></label><p id="formError" role="alert"></p><div class="dialog-actions"><button type="button" data-close="editor">キャンセル</button><button class="primary" type="submit">保存する</button></div></form></dialog>
<dialog id="folderDialog"><form id="folderForm"><h2 id="folderTitle">フォルダを作成</h2><input id="folderId" type="hidden"><label>フォルダ名<input id="folderName" required maxlength="100"></label><p id="folderError" role="alert"></p><div class="dialog-actions"><button type="button" data-close="folderDialog">キャンセル</button><button type="submit" class="primary">保存する</button></div></form></dialog>
<dialog id="confirmDialog"><h2 id="confirmTitle"></h2><p id="confirmText"></p><div class="dialog-actions"><button id="confirmNo">キャンセル</button><button id="confirmYes" class="primary">実行する</button></div></dialog>
<dialog id="helpDialog"><h2>使い方・保存について</h2><p>「お気に入りを追加」からタイトルとURLを登録します。フォルダ名を選ぶと絞り込めます。カードの「編集」「削除」で管理できます。</p><p>データはこのブラウザのIndexedDBに保存します。WindowsとiPhoneで自動共有されません。ブラウザデータの消去や端末の故障に備え、定期的にJSONを書き出してください。プライベートブラウズは避けてください。</p><p>HTMLはEdge・Chrome・Safariなどのブックマーク書き出し形式に対応。入れ子のフォルダは「親 / 子」にまとめます。同じURLは取り込み時にスキップします。</p><p>JSON復元は現在のデータを置き換えます。復元前にバックアップを保存してください。</p><p>iPhoneはSafariの共有メニューから「ホーム画面に追加」、WindowsはEdge/Chromeのインストール機能をご利用ください。一度オンラインで開き、オフライン利用の準備完了表示を確認してください。登録リンクの閲覧には通信が必要です。</p><p>Google接続は期限切れ・再読み込みで解除されます。DriveのappDataFolderは通常のマイドライブには表示されません。複数タブでの同時編集は避けてください。</p><div class="dialog-actions"><button data-close="helpDialog" class="primary">閉じる</button></div></dialog>`;
function status(message,error=false){$('#status').textContent=message;$('#status').className=error?'error':'notice';}
function fail(e){console.error(e);status(`処理できませんでした：${e.message || '保存領域を確認してください。'}`,true);}
function render(){
  const current=state.folders.find(f=>f.id===folder);
  if(folder!=='all'&&folder!=='none'&&!current)folder='all';
  $('#heading').textContent=folder==='all'?'すべてのお気に入り':folder==='none'?'未分類':current.name;
  const nav=[{id:'all',name:'すべてのお気に入り',icon:'▦'},{id:'none',name:'未分類',icon:'▱'},...state.folders.map(f=>({...f,icon:'▱'}))];
  $('#folders').innerHTML=nav.map(f=>`<button data-folder="${escape(f.id)}" ${f.id===folder?'aria-current="page"':''}><span>${f.icon}　${escape(f.name)}</span><span class="count">${state.bookmarks.filter(b=>f.id==='all'||(f.id==='none'?b.folderId===null:b.folderId===f.id)).length}</span></button>`).join('');
  $('#folderActions').innerHTML=current?'<button class="subtle" id="renameFolder">名前を変更</button><button class="subtle" id="deleteFolder">フォルダを削除</button>':'';
  $('#renameFolder')?.addEventListener('click',()=>openFolder(current));
  $('#deleteFolder')?.addEventListener('click',async()=>{if(await confirmAction('フォルダを削除','中のお気に入りは削除せず「未分類」に移動します。'))await mutate(next=>{next.folders=next.folders.filter(f=>f.id!==folder);next.bookmarks.forEach(b=>{if(b.folderId===folder)b.folderId=null;});},'フォルダを削除しました。');});
  const items=filterBookmarks(state,folder,query).sort((a,b)=>$('#sort').value==='title'?a.title.localeCompare(b.title,'ja'):$('#sort').value==='old'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));
  $('#summary').textContent=`${items.length} 件のお気に入り${query?'（検索結果）':''} · ${state.folders.length} フォルダ`;
  $('#cards').innerHTML=items.length?items.map(b=>`<article class="card"><div class="card-top"><span class="site-icon" aria-hidden="true">${escape(new URL(b.url).hostname.slice(0,1).toUpperCase())}</span><span class="folder-tag">${escape(state.folders.find(f=>f.id===b.folderId)?.name||'未分類')}</span></div><h2><a href="${escape(b.url)}" target="_blank" rel="noopener noreferrer">${escape(b.title)} <span aria-hidden="true">↗</span></a></h2><p class="domain">${escape(new URL(b.url).hostname)}</p><p class="note">${escape(b.note||'メモはありません')}</p><div class="card-bottom"><time datetime="${escape(b.createdAt)}">${new Date(b.createdAt).toLocaleDateString('ja-JP')}</time><div><button data-edit="${escape(b.id)}">編集</button><button data-delete="${escape(b.id)}" aria-label="${escape(b.title)}を削除">削除</button></div></div></article>`).join(''):`<div class="empty"><span aria-hidden="true">▱</span><h2>${query?'見つかりませんでした':'お気に入りの居場所を、ここに。'}</h2><p>${query?'キーワードやフォルダを変えてみてください。':'気になるページを追加するか、HTMLブックマークを取り込みましょう。'}</p>${query?'':'<button class="primary" id="emptyAdd">＋ 最初のお気に入りを追加</button>'}</div>`;
  $('#emptyAdd')?.addEventListener('click',()=>openEditor());
}
async function mutate(change,message,skipSave=false){
  if(!ready||busy)return false;busy=true;
  try{const perform=async()=>{const next=await repository.load();await change(next);if(!skipSave)await repository.save(next);state=next;};if(navigator.locks)await navigator.locks.request('bookmark-hub-write',perform);else await perform();render();status(message);channel?.postMessage('changed');return true;}catch(e){fail(e);return false;}finally{busy=false;}
}
const channel='BroadcastChannel' in window?new BroadcastChannel('bookmark-hub'):null;
if(channel)channel.onmessage=async()=>{if(!busy){try{state=await repository.load();render();}catch(e){fail(e);}}};
function openEditor(id){if(!ready)return;const b=state.bookmarks.find(x=>x.id===id);$('#bookmarkForm').reset();$('#bookmarkId').value=b?.id||'';$('#editorTitle').textContent=b?'お気に入りを編集':'お気に入りを追加';$('#folderSelect').innerHTML='<option value="">未分類</option>'+state.folders.map(f=>`<option value="${escape(f.id)}">${escape(f.name)}</option>`).join('');for(const k of ['title','url','note'])$('#'+k).value=b?.[k]||'';$('#folderSelect').value=b?.folderId||(state.folders.some(f=>f.id===folder)?folder:'');$('#formError').textContent='';$('#editor').showModal();$('#title').focus();}
function openFolder(f){if(!ready)return;$('#folderId').value=f?.id||'';$('#folderName').value=f?.name||'';$('#folderTitle').textContent=f?'フォルダ名を変更':'フォルダを作成';$('#folderError').textContent='';$('#folderDialog').showModal();$('#folderName').focus();}
function confirmAction(title,text){$('#confirmTitle').textContent=title;$('#confirmText').textContent=text;const d=$('#confirmDialog');d.showModal();return new Promise(resolve=>{const finish=value=>{d.close();$('#confirmYes').onclick=null;$('#confirmNo').onclick=null;d.oncancel=null;resolve(value);};$('#confirmYes').onclick=()=>finish(true);$('#confirmNo').onclick=()=>finish(false);d.oncancel=e=>{e.preventDefault();finish(false);};});}
document.addEventListener('click',async e=>{const close=e.target.closest('[data-close]');if(close)$('#'+close.dataset.close).close();const f=e.target.closest('[data-folder]');if(f){folder=f.dataset.folder;render();}const edit=e.target.closest('[data-edit]');if(edit)openEditor(edit.dataset.edit);const del=e.target.closest('[data-delete]');if(del&&await confirmAction('お気に入りを削除','このお気に入りを削除します。よろしいですか？'))await mutate(next=>{next.bookmarks=next.bookmarks.filter(b=>b.id!==del.dataset.delete);},'お気に入りを削除しました。');});
$('#add').onclick=()=>openEditor();$('#addFolder').onclick=()=>openFolder();$('#search').oninput=e=>{query=e.target.value;render();};$('#sort').onchange=render;
$('#bookmarkForm').onsubmit=async e=>{e.preventDefault();try{const id=$('#bookmarkId').value,now=new Date().toISOString();const values={title:$('#title').value.trim(),url:safeUrl($('#url').value.trim()),note:$('#note').value.trim(),folderId:$('#folderSelect').value||null,updatedAt:now};if(!values.title)throw new Error('タイトルを入力してください。');if(await mutate(next=>{if(values.folderId&&!next.folders.some(f=>f.id===values.folderId))values.folderId=null;if(id){const b=next.bookmarks.find(b=>b.id===id);if(!b)throw new Error('このお気に入りは削除済みです。');Object.assign(b,values);}else next.bookmarks.push({id:crypto.randomUUID(),createdAt:now,...values});},'お気に入りを保存しました。'))$('#editor').close();else $('#formError').textContent='保存できませんでした。画面のエラーを確認してください。';}catch(e){$('#formError').textContent=e.message;}};
$('#folderForm').onsubmit=async e=>{e.preventDefault();const name=$('#folderName').value.trim(),id=$('#folderId').value;if(!name){$('#folderError').textContent='フォルダ名を入力してください。';return;}if(await mutate(next=>{if(next.folders.some(f=>f.name===name&&f.id!==id))throw new Error('同じ名前のフォルダがあります。');if(id){const f=next.folders.find(f=>f.id===id);if(!f)throw new Error('フォルダは削除済みです。');f.name=name;}else next.folders.push({id:crypto.randomUUID(),name});},'フォルダを保存しました。'))$('#folderDialog').close();else $('#folderError').textContent='保存できませんでした。画面のエラーを確認してください。';};
$('#htmlImport').onclick=()=>{if(ready)$('#htmlFile').click();};$('#jsonImport').onclick=()=>{if(ready)$('#jsonFile').click();};
async function readFile(input){const f=input.files[0];input.value='';if(!f)return null;if(f.size>20*1024*1024)throw new Error('20MB以下のファイルを選んでください。');return await f.text();}
$('#htmlFile').onchange=async e=>{try{const text=await readFile(e.target);if(text===null)return;const parsed=parseBookmarkHtml(text);validateState(parsed.state);if(!parsed.state.bookmarks.length)throw new Error('取り込めるHTTP/HTTPSリンクがありません。');if(!await confirmAction('HTMLブックマークを取り込む',`${parsed.state.bookmarks.length} 件を確認しました。不正なURL ${parsed.skipped} 件は除外します。同じURLはスキップして追加します。`))return;let result;const saved=await mutate(next=>{result=mergeImport(next,parsed.state);Object.assign(next,result.state);},'HTMLを取り込みました。');if(saved&&result)status(`${result.added} 件を追加、重複 ${result.skipped} 件・不正URL ${parsed.skipped} 件をスキップしました。`);}catch(e){fail(e);}};
$('#jsonFile').onchange=async e=>{try{const text=await readFile(e.target);if(text===null)return;const restored=validateState(JSON.parse(text));if(await confirmAction('JSONから復元（現在のデータを置き換え）',`現在のデータを、${restored.bookmarks.length} 件のお気に入りと ${restored.folders.length} フォルダに置き換えます。必要なバックアップは先に書き出してください。`))await restoreState(restored,'JSONから復元しました。');}catch(e){fail(e);}};
$('#backup').onclick=async()=>{if(!ready)return;try{downloadBackup(await repository.load());status('JSONを作成しました。ダウンロード先・ファイルアプリで保存を確認してください。');}catch(e){fail(e);}};
$('#help').onclick=()=>$('#helpDialog').showModal();
function network(){$('#network').textContent=navigator.onLine?'● オンライン':'○ オフライン';}window.addEventListener('online',network);window.addEventListener('offline',network);network();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install').hidden=false;});$('#install').onclick=async()=>{await installPrompt?.prompt();installPrompt=null;$('#install').hidden=true;};
try{state=await repository.load();ready=true;render();}catch(e){$('#summary').textContent='保存領域を利用できません';fail(e);}


let driveBusy=false;
const drive=new GoogleDrive(updateGoogle);
function updateGoogle(){
 $('#googleState').textContent=drive.connected?'接続中（Google Driveアクセス許可あり）':'未接続（期限切れ時は再接続）';
 $('#googleLogin').disabled=driveBusy;$('#googleLogout').disabled=driveBusy||!drive.connected;
 for(const id of ['driveUpload','driveRestore'])$('#'+id).disabled=driveBusy||!drive.connected||!ready;
 let last;try{last=localStorage.getItem('bookmark-hub-last-sync');}catch{}$('#lastSync').textContent='最終同期：'+(last?new Date(last).toLocaleString('ja-JP')+'（この端末の最終成功操作）':'未実行');
}
function synced(){try{localStorage.setItem('bookmark-hub-last-sync',new Date().toISOString());}catch{}updateGoogle();}
async function restoreState(value,message){
 return mutate(async next=>{await repository.replaceWithBackup(value);Object.assign(next,value);},message,true);
}
async function driveAction(action){if(driveBusy||busy||!ready)return;driveBusy=true;updateGoogle();
 try{await action();}catch(e){fail(e);}finally{driveBusy=false;updateGoogle();}}
$('#googleLogin').onclick=()=>driveAction(async()=>{await drive.login();status('Google Driveに接続しました。保存・復元は手動で実行してください。');});
$('#googleLogout').onclick=()=>{drive.clear();status('このアプリのGoogle接続を切断しました。');};
$('#driveUpload').onclick=()=>driveAction(async()=>{
 const file=await drive.find();
 const value=await repository.load();
 if(!await confirmAction('Driveへ保存（'+value.bookmarks.length+' 件・'+value.folders.length+' フォルダ）',file?'Driveの保存データを上書きします。上書き前のDriveデータを別名でバックアップします。よろしいですか？':'この端末の全データをDriveへ保存します。よろしいですか？'))return;
 if(file){const old=await drive.read(file);await drive.create(old,'bookmark-hub-before-upload-'+new Date().toISOString().replaceAll(':','-')+'.json');await drive.replace(file,value);}else await drive.create(value);
 synced();status('Driveへ保存しました。上書き前バックアップはDriveに保持します。');
});
$('#driveRestore').onclick=()=>driveAction(async()=>{
 const file=await drive.find();if(!file)throw new Error('Driveに保存データがありません。先に「Driveへ保存」を実行してください。');
 const value=await drive.read(file);
 if(!await confirmAction('Driveから復元（全件置き換え）',value.bookmarks.length+' 件・'+value.folders.length+' フォルダでこの端末のデータを置き換えます。現在のデータは復元前バックアップとして端末に保存します。よろしいですか？'))return;
 if(await restoreState(value,'Driveから復元しました。復元前バックアップも保存しました。'))synced();
});
$('#recovery').onclick=async()=>{try{const value=await repository.loadBackup();if(!value)throw new Error('復元前バックアップはまだありません。');downloadBackup(value);status('復元前バックアップを書き出しました。JSONから復元できます。');}catch(e){fail(e);}};
updateGoogle();

void (async()=>{if(import.meta.env.PROD&&'serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL});await navigator.serviceWorker.ready;if(ready)status('オフライン利用の準備ができました。データはこの端末に保存されます。');reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)status('新しい版があります。開いているBookmark Hubをすべて閉じてから開き直してください。');});});}catch(e){status('オフライン準備に失敗しました。通信状態を確認して再読み込みしてください。',true);}}})();
