import {folderRows} from './model.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Native buttons provide keyboard access without imposing ARIA tree keyboard semantics.
export function renderFolderTree(state,selected,collapsed){
  const rows=folderRows(state),counts=new Map(),children=new Set();
  for(const b of state.bookmarks)counts.set(b.folderId,(counts.get(b.folderId)||0)+1);
  for(const row of [...rows].reverse()){const f=row.folder;if(f.parentId!==null){children.add(f.parentId);counts.set(f.parentId,(counts.get(f.parentId)||0)+(counts.get(f.id)||0));}}
  const select=(id,name,count,title=name)=>`<button class="folder-choice" data-folder="${escape(id)}" ${id===selected?'aria-current="page"':''} title="${escape(title)}"><span>${escape(name)}</span><span class="count">${count||0}</span></button>`;
  return `<div class="tree-row">${select('all','▦　すべてのお気に入り',state.bookmarks.length)}</div><div class="tree-row">${select('none','▱　未分類',counts.get(null))}</div>`+rows.filter(r=>r.ancestors.every(id=>!collapsed.has(id))).map(({folder:f,depth,path})=>`<div class="tree-row" style="--depth:${depth}">${children.has(f.id)?`<button class="tree-toggle" data-toggle-folder="${escape(f.id)}" aria-expanded="${!collapsed.has(f.id)}" aria-label="${escape(path)}の子フォルダを${collapsed.has(f.id)?'開く':'閉じる'}">${collapsed.has(f.id)?'▸':'▾'}</button>`:'<span class="tree-spacer" aria-hidden="true"></span>'}${select(f.id,'▱　'+f.name,counts.get(f.id),path)}</div>`).join('');
}
