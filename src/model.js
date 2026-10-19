export const newState = () => ({version:2, folders:[], bookmarks:[]});
export const MAX_FOLDER_DEPTH=20;
export function safeUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URLは https:// または http:// で始めてください。');
  return url.href;
}
export function validateState(data) {
  if (!data || ![1,2].includes(data.version) || !Array.isArray(data.folders) || !Array.isArray(data.bookmarks)) throw new Error('対応するBookmark HubのJSONではありません。');
  if(data.folders.length>10000 || data.bookmarks.length>50000) throw new Error('データ件数が上限を超えています。');
  const ids = new Set();
  const str = (s, max) => typeof s === 'string' && s.length <= max;
  const folders = data.folders.map(f => {
    if (!f || !str(f.id,100) || !f.id || ids.has(f.id) || !str(f.name,100) || !f.name.trim()) throw new Error('フォルダ情報が不正です。');
    if(data.version===1&&f.parentId!=null)throw new Error('階層フォルダのJSONはversion:2が必要です。');
    const parentId=data.version===1?null:f.parentId;
    if(parentId!==null&&(!str(parentId,100)||!parentId))throw new Error('親フォルダ情報が不正です。');
    ids.add(f.id); return {id:f.id,name:f.name.trim(),parentId};
  });
  const byId=new Map(folders.map(f=>[f.id,f]));
  for(const f of folders){const seen=new Set([f.id]);let parent=f.parentId,depth=1;
    while(parent!==null){if(!byId.has(parent)||seen.has(parent))throw new Error('親フォルダが存在しないか、階層が循環しています。');
      if(++depth>MAX_FOLDER_DEPTH)throw new Error(`フォルダ階層は${MAX_FOLDER_DEPTH}段までです。`);seen.add(parent);parent=byId.get(parent).parentId;}}
  const bids=new Set();
  const bookmarks=data.bookmarks.map(b=>{
    if(!b || !str(b.id,100) || !b.id || bids.has(b.id) || !str(b.title,300) || !b.title.trim() || !str(b.url,8000) || !str(b.note,3000) || !(b.folderId===null || ids.has(b.folderId)) || !str(b.createdAt,100) || !str(b.updatedAt,100) || !Number.isFinite(Date.parse(b.createdAt)) || !Number.isFinite(Date.parse(b.updatedAt))) throw new Error('お気に入り情報が不正です。');
    bids.add(b.id);return {id:b.id,title:b.title.trim(),url:safeUrl(b.url),note:b.note,folderId:b.folderId,createdAt:b.createdAt,updatedAt:b.updatedAt};
  });
  return {version:2,folders,bookmarks};
}
export function descendantIds(state,id){
  const result=new Set([id]),children=new Map();
  for(const f of state.folders){const parent=f.parentId??null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(f.id);}
  const pending=[id];while(pending.length){for(const child of children.get(pending.pop())||[])if(!result.has(child)){result.add(child);pending.push(child);}}
  return result;
}
export function folderRows(state){
  const children=new Map();for(const f of state.folders){const parent=f.parentId??null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(f);}
  const rows=[],pending=(children.get(null)||[]).map(f=>({folder:f,depth:0,path:f.name,ancestors:[]})).reverse();
  while(pending.length){const row=pending.pop();rows.push(row);for(const f of [...(children.get(row.folder.id)||[])].reverse())pending.push({folder:f,depth:row.depth+1,path:row.path+' / '+f.name,ancestors:[...row.ancestors,row.folder.id]});}
  return rows;
}
export function removeFolder(state,id){const ids=descendantIds(state,id);state.folders=state.folders.filter(f=>!ids.has(f.id));for(const b of state.bookmarks)if(ids.has(b.folderId))b.folderId=null;}
export function filterBookmarks(state, folder, query) {
  const q=query.trim().toLocaleLowerCase('ja');
  const ids=descendantIds(state,folder);
  return state.bookmarks.filter(b => (folder==='all' || (folder==='none'?b.folderId===null:ids.has(b.folderId))) && `${b.title} ${b.url} ${b.note}`.toLocaleLowerCase('ja').includes(q));
}
export function mergeImport(state, incoming) {
  const next=validateState(state), source=validateState(incoming), folderMap=new Map();
  for(const {folder:f} of folderRows(source)){const parentId=f.parentId===null?null:folderMap.get(f.parentId);let found=next.folders.find(x=>x.name===f.name&&x.parentId===parentId);if(!found){found={id:crypto.randomUUID(),name:f.name,parentId};next.folders.push(found);}folderMap.set(f.id,found.id);}
  const urls=new Set(next.bookmarks.map(b=>b.url));let added=0;
  for(const b of source.bookmarks){if(urls.has(b.url))continue;next.bookmarks.push({...b,id:crypto.randomUUID(),folderId:folderMap.get(b.folderId)||null});urls.add(b.url);added++;}
  return {state:validateState(next),added,skipped:source.bookmarks.length-added};
}
