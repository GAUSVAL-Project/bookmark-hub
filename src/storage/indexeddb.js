import { newState, validateState } from '../model.js';
let dbPromise;
function open(){
  return dbPromise ||= new Promise((resolve,reject)=>{
    const req=indexedDB.open('bookmark-hub',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('data');
    req.onerror=()=>{dbPromise=null;reject(req.error);};
    req.onblocked=()=>{dbPromise=null;reject(new Error('他のBookmark Hubを閉じて再読み込みしてください。'));};
    req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db);};
  });
}
// The repository boundary is asynchronous so a future sync layer can use it.
export const repository={
 async loadBackup(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readonly');const req=tx.objectStore('data').get('before-restore');tx.oncomplete=()=>resolve(req.result?validateState(req.result):null);tx.onabort=()=>reject(tx.error);});},
 async replaceWithBackup(state){const value=validateState(state),db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite'),store=tx.objectStore('data');const req=store.get('state');req.onsuccess=()=>{store.put(req.result||newState(),'before-restore');store.put(value,'state');};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});},
  async load(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readonly');const r=tx.objectStore('data').get('state');tx.oncomplete=()=>{try{resolve(r.result?validateState(r.result):newState());}catch(e){reject(e);}};tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});},
  async save(state){const value=validateState(state);const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,'state');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
};
