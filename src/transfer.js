import {newState,safeUrl} from './model.js';
export function parseBookmarkHtml(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  if(!doc.querySelector('a[href]'))throw new Error('ブックマークのリンクが見つかりません。');
  const state=newState();let skipped=0;
  const folders=new Map();
  function walk(list,path=[]){
    for(const el of list.children){
      if(el.tagName==='H3'){continue;}
      if(el.tagName==='A'){add(el,path);continue;}
      if(el.tagName==='DT'){
        const h=Array.from(el.children).find(x=>x.tagName==='H3');
        const a=Array.from(el.children).find(x=>x.tagName==='A');
        if(a)add(a,path);
        if(h){const next=[...path,h.textContent.trim()||'名称なし'];const dl=Array.from(el.children).find(x=>x.tagName==='DL') || (el.nextElementSibling?.tagName==='DL'?el.nextElementSibling:null);if(dl){walk(dl,next);visited.add(dl);}}
        else for(const child of el.children)if(child.tagName==='DL'&&!visited.has(child)){visited.add(child);walk(child,path);}
      }else if(el.tagName==='DL'&&!visited.has(el)){visited.add(el);walk(el,path);}
    }
  }
  function add(a,path){try{const url=safeUrl(a.getAttribute('href'));const name=path.join(' / ').slice(0,100);let folderId=null;if(name){if(!folders.has(name)){folderId=crypto.randomUUID();folders.set(name,folderId);state.folders.push({id:folderId,name});}folderId=folders.get(name);}const now=new Date().toISOString();state.bookmarks.push({id:crypto.randomUUID(),title:(a.textContent.trim()||url).slice(0,300),url,note:'',folderId,createdAt:now,updatedAt:now});}catch{skipped++;}}
  const visited=new Set();
  const root=doc.querySelector('dl');
  if(root){visited.add(root);walk(root);}else for(const a of doc.querySelectorAll('a[href]'))add(a,[]);
  return {state,skipped};
}
export function downloadBackup(state){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`bookmark-hub-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
