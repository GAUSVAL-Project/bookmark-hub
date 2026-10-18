export const newState = () => ({version:1, folders:[], bookmarks:[]});
export function safeUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URLは https:// または http:// で始めてください。');
  return url.href;
}
export function validateState(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.folders) || !Array.isArray(data.bookmarks)) throw new Error('対応するBookmark HubのJSONではありません。');
  if(data.folders.length>10000 || data.bookmarks.length>50000) throw new Error('データ件数が上限を超えています。');
  const ids = new Set();
  const str = (s, max) => typeof s === 'string' && s.length <= max;
  const folders = data.folders.map(f => {
    if (!f || !str(f.id,100) || !f.id || ids.has(f.id) || !str(f.name,100) || !f.name.trim()) throw new Error('フォルダ情報が不正です。');
    ids.add(f.id); return {id:f.id,name:f.name.trim()};
  });
  const bids=new Set();
  const bookmarks=data.bookmarks.map(b=>{
    if(!b || !str(b.id,100) || !b.id || bids.has(b.id) || !str(b.title,300) || !b.title.trim() || !str(b.url,8000) || !str(b.note,3000) || !(b.folderId===null || ids.has(b.folderId)) || !str(b.createdAt,100) || !str(b.updatedAt,100) || !Number.isFinite(Date.parse(b.createdAt)) || !Number.isFinite(Date.parse(b.updatedAt))) throw new Error('お気に入り情報が不正です。');
    bids.add(b.id);return {id:b.id,title:b.title.trim(),url:safeUrl(b.url),note:b.note,folderId:b.folderId,createdAt:b.createdAt,updatedAt:b.updatedAt};
  });
  return {version:1,folders,bookmarks};
}
export function filterBookmarks(state, folder, query) {
  const q=query.trim().toLocaleLowerCase('ja');
  return state.bookmarks.filter(b => (folder==='all' || (folder==='none'?b.folderId===null:b.folderId===folder)) && `${b.title} ${b.url} ${b.note}`.toLocaleLowerCase('ja').includes(q));
}
export function mergeImport(state, incoming) {
  const next=structuredClone(state), folderMap=new Map();
  for(const f of incoming.folders){let found=next.folders.find(x=>x.name===f.name);if(!found){found={id:crypto.randomUUID(),name:f.name};next.folders.push(found);}folderMap.set(f.id,found.id);}
  const urls=new Set(next.bookmarks.map(b=>b.url));let added=0;
  for(const b of incoming.bookmarks){if(urls.has(b.url))continue;next.bookmarks.push({...b,id:crypto.randomUUID(),folderId:folderMap.get(b.folderId)||null});urls.add(b.url);added++;}
  return {state:next,added,skipped:incoming.bookmarks.length-added};
}
