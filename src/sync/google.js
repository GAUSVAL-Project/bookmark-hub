import {validateState} from '../model.js';
export const SCOPE='https://www.googleapis.com/auth/drive.appdata';
const NAME='bookmark-hub.json', API='https://www.googleapis.com/drive/v3/files';
function serialize(state){const text=JSON.stringify(validateState(state));if(new Blob([text]).size>20*1024*1024)throw new Error('保存データが20MBを超えています。端末のJSONバックアップをご利用ください。');return text;}
export class GoogleDrive {
  constructor(onChange=()=>{}, fetcher=(...args)=>fetch(...args)){this.onChange=onChange;this.fetcher=fetcher;this.token='';this.expires=0;}
  get connected(){return !!this.token&&Date.now()<this.expires;}
  clear(){this.token='';this.expires=0;clearTimeout(this.timer);this.onChange();}
  login(){
    const id=window.BOOKMARK_HUB_GOOGLE_CLIENT_ID;
    if(!id||id.startsWith('YOUR_'))throw new Error('google-config.js にOAuthクライアントIDを設定してください。');
    if(!window.google?.accounts?.oauth2)throw new Error('Google認証を読み込めません。通信・広告ブロックを確認して再読み込みしてください。');
    return new Promise((resolve,reject)=>{
      const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,include_granted_scopes:false,
        callback:r=>{if(r.error||!r.access_token||!google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE)){this.clear();reject(new Error('Google Driveへのアクセスが許可されませんでした。'));return;}
          if(!Number.isFinite(Number(r.expires_in))||Number(r.expires_in)<=30){this.clear();reject(new Error('Google接続の有効期限を確認できません。再接続してください。'));return;}
          clearTimeout(this.timer);this.token=r.access_token;this.expires=Date.now()+Math.max(0,Number(r.expires_in)*1000-30000);
          this.timer=setTimeout(()=>this.clear(),Math.max(0,this.expires-Date.now()));this.onChange();resolve();},
        error_callback:()=>reject(new Error('認証画面を開けないか、閉じられました。ポップアップを許可して再試行してください。'))});
      client.requestAccessToken({prompt:'select_account'});
    });
  }
  async request(url,options={}){
    if(!this.connected){this.clear();throw new Error('Googleに再接続してください（接続期限切れ）。');}
    if(!navigator.onLine)throw new Error('オフラインです。通信を確認してください。');
    let response;
    try{response=await this.fetcher(url,{...options,headers:{...options.headers,Authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(30000)});}catch{throw new Error('通信に失敗しました。再試行前にDriveの内容を確認してください。');}
    if(response.status===401){this.clear();throw new Error('Google接続が失効しました。再接続してください。');}
    if(!response.ok)throw new Error(response.status===403?'Driveのアクセス権限、API有効化、容量を確認してください。':response.status===429?'操作が多すぎます。時間をおいて再試行してください。':`Drive処理に失敗しました（HTTP ${response.status}）。再試行前に内容を確認してください。`);
    return response;
  }
  async find(){
    let token='',files=[];
    do{const q=new URLSearchParams({spaces:'appDataFolder',q:`name = '${NAME}' and trashed = false`,fields:'nextPageToken,files(id,name,modifiedTime)',pageSize:'100',orderBy:'modifiedTime desc',...(token?{pageToken:token}:{})});
      const data=await(await this.request(`${API}?${q}`)).json();files.push(...(data.files||[]));token=data.nextPageToken||'';
    }while(token);
    if(files.length>1)throw new Error('同名のDriveデータが複数あります。自動選択を中止しました。');
    return files[0]||null;
  }
  async read(file){const response=await this.request(`${API}/${encodeURIComponent(file.id)}?alt=media`);
    if(Number(response.headers.get('content-length'))>20*1024*1024)throw new Error('Driveデータが20MBを超えています。');
    const text=await response.text();if(new Blob([text]).size>20*1024*1024)throw new Error('Driveデータが20MBを超えています。');
    return validateState(JSON.parse(text));}
  async create(state,name=NAME){
    const text=serialize(state);
    const body=new FormData();body.append('metadata',new Blob([JSON.stringify({name,parents:['appDataFolder'],mimeType:'application/json'})],{type:'application/json'}));
    body.append('file',new Blob([text],{type:'application/json'}));
    return (await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',body})).json();
  }
  async replace(file,state){await this.request(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:serialize(state)});}
}
