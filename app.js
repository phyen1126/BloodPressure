const KEY='bpRecordsV7',FILE_ID_KEY='bpDriveFileIdV7',THEME='bpThemeV7';
const SCOPE='https://www.googleapis.com/auth/drive.file';
const $=id=>document.getElementById(id);
let accessToken='',tokenClient=null,tokenExpiresAt=0;

function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(r){localStorage.setItem(KEY,JSON.stringify(r))}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(t){return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t))}
function classify(s,d){if(s>=180||d>=120)return{key:'danger',label:'非常高'};if(s>=140||d>=90)return{key:'warn',label:'偏高'};if(s<90||d<60)return{key:'warn',label:'偏低'};if(s>=130||d>=80)return{key:'warn',label:'稍高'};return{key:'ok',label:'一般範圍'}}
function setDriveStatus(text,ok=false){$('driveStatus').textContent=text;$('driveStatus').style.color=ok?'var(--ok)':''}

function initGoogle(){
  const id=window.BP_CONFIG?.GOOGLE_CLIENT_ID||'';
  if(!id||id.startsWith('請貼上')){setDriveStatus('尚未設定 Google OAuth Client ID。請編輯 config.js。');return}
  if(!window.google?.accounts?.oauth2){setTimeout(initGoogle,300);return}
  tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:id,scope:SCOPE,
    callback:resp=>{
      if(resp.error){setDriveStatus(`Google 授權失敗：${resp.error}`);return}
      accessToken=resp.access_token;tokenExpiresAt=Date.now()+(Number(resp.expires_in||3600)-60)*1000;
      $('syncBtn').disabled=false;$('disconnectBtn').classList.remove('hidden');
      setDriveStatus('Google Drive 已連線。',true);
      syncDrive().catch(showError);
    }
  });
}
function ensureToken(interactive=true){
  return new Promise((resolve,reject)=>{
    if(accessToken&&Date.now()<tokenExpiresAt)return resolve(accessToken);
    if(!tokenClient)return reject(new Error('Google OAuth 尚未設定完成'));
    const old=tokenClient.callback;
    tokenClient.callback=resp=>{
      tokenClient.callback=old;
      if(resp.error)return reject(new Error(resp.error));
      accessToken=resp.access_token;tokenExpiresAt=Date.now()+(Number(resp.expires_in||3600)-60)*1000;
      $('syncBtn').disabled=false;$('disconnectBtn').classList.remove('hidden');setDriveStatus('Google Drive 已連線。',true);resolve(accessToken)
    };
    tokenClient.requestAccessToken({prompt:interactive?'consent':''});
  })
}
async function api(url,options={}){
  const token=await ensureToken(false);
  const r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}});
  if(!r.ok)throw new Error(`Google Drive API ${r.status}: ${await r.text()}`);
  return r
}
async function findDriveFile(){
  const stored=localStorage.getItem(FILE_ID_KEY);
  if(stored)return stored;
  const q=encodeURIComponent("name='BloodPressure.csv' and trashed=false");
  const r=await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=10`);
  const data=await r.json();
  if(data.files?.length){localStorage.setItem(FILE_ID_KEY,data.files[0].id);return data.files[0].id}
  return ''
}
async function downloadDriveRecords(fileId){
  if(!fileId)return[];
  const r=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
  return parseCSV(await r.text())
}
async function createDriveFile(csv){
  const boundary='bp_boundary_'+Date.now();
  const metadata={name:'BloodPressure.csv',mimeType:'text/csv',appProperties:{app:'BloodPressurePWA',version:'7'}};
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${csv}\r\n--${boundary}--`;
  const r=await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  return await r.json()
}
async function updateDriveFile(fileId,csv){
  await api(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'text/csv; charset=UTF-8'},body:csv})
}
function mergeRecords(a,b){
  const map=new Map();
  [...a,...b].forEach(r=>{if(r.id)map.set(r.id,r)});
  return [...map.values()].sort((x,y)=>new Date(x.time)-new Date(y.time))
}
async function syncDrive(){
  setDriveStatus('正在同步 Google Drive…');
  await ensureToken(false);
  let fileId=await findDriveFile(),remote=[];
  if(fileId){
    try{remote=await downloadDriveRecords(fileId)}
    catch(e){localStorage.removeItem(FILE_ID_KEY);fileId=''}
  }
  const merged=mergeRecords(load(),remote);save(merged);
  const csv=buildCSV(merged);
  if(fileId)await updateDriveFile(fileId,csv);
  else{const created=await createDriveFile(csv);fileId=created.id;localStorage.setItem(FILE_ID_KEY,fileId)}
  render();setDriveStatus(`同步完成，共 ${merged.length} 筆。`,true)
}
function showError(e){console.error(e);setDriveStatus(`同步失敗：${e.message}`)}
function filtered(){let r=load(),q=$('search').value.toLowerCase();r.sort((a,b)=>$('sort').value==='asc'?new Date(a.time)-new Date(b.time):new Date(b.time)-new Date(a.time));return q?r.filter(x=>[fmt(x.time),x.sys,x.dia,x.hr,x.note].join(' ').toLowerCase().includes(q)):r}
function render(){
  const all=load().sort((a,b)=>new Date(b.time)-new Date(a.time)),last=all[0],now=new Date();
  $('latest').textContent=last?`${last.sys}/${last.dia}`:'—';$('latestTime').textContent=last?fmt(last.time):'尚無紀錄';$('count').textContent=all.length;
  $('monthCount').textContent=`本月 ${all.filter(r=>{let d=new Date(r.time);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length} 筆`;
  if(all.length){$('average').textContent=`${Math.round(all.reduce((s,r)=>s+r.sys,0)/all.length)}/${Math.round(all.reduce((s,r)=>s+r.dia,0)/all.length)}`;$('avgHr').textContent=`平均心跳 ${Math.round(all.reduce((s,r)=>s+r.hr,0)/all.length)}`;$('latestState').textContent=classify(last.sys,last.dia).label}else{$('average').textContent='—';$('avgHr').textContent='平均心跳 —';$('latestState').textContent='—'}
  const rows=filtered(),tb=$('history').querySelector('tbody');tb.innerHTML=rows.map(r=>{let c=classify(r.sys,r.dia);return`<tr><td>${fmt(r.time)}</td><td><strong>${r.sys}/${r.dia}</strong></td><td>${r.hr}</td><td><span class="pill pill-${c.key}">${c.label}</span></td><td>${esc(r.note)}</td><td><div class="row-actions"><button data-edit="${r.id}">編輯</button><button data-del="${r.id}" class="danger">刪除</button></div></td></tr>`}).join('');
  $('history').classList.toggle('hidden',!rows.length);$('empty').classList.toggle('hidden',!!rows.length);
  tb.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));tb.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del));draw(all.slice(0,+$('range').value).reverse())
}
function edit(id){let r=load().find(x=>x.id===id);if(!r)return;$('editId').value=id;$('sys').value=r.sys;$('dia').value=r.dia;$('hr').value=r.hr;$('note').value=r.note;$('formTitle').textContent='編輯紀錄';$('saveBtn').textContent='更新紀錄';$('cancelBtn').classList.remove('hidden');scrollTo({top:0,behavior:'smooth'})}
function cancel(){$('form').reset();$('editId').value='';$('formTitle').textContent='新增紀錄';$('saveBtn').textContent='儲存紀錄';$('cancelBtn').classList.add('hidden')}
function del(id){if(!confirm('確定刪除這筆本機紀錄？下次同步會把 Drive 版本重新合併回來；完整跨裝置刪除需後續版本支援刪除標記。'))return;save(load().filter(r=>r.id!==id));render()}
function draw(r){let c=$('chart'),x=c.getContext('2d'),w=c.width,h=c.height,dark=document.documentElement.dataset.theme==='dark';x.clearRect(0,0,w,h);x.fillStyle=dark?'#0f1c2e':'#fff';x.fillRect(0,0,w,h);if(!r.length){x.fillStyle='#64748b';x.font='22px sans-serif';x.fillText('尚無資料',w/2-45,h/2);return}let p={l:48,r:16,t:20,b:35},max=Math.max(180,...r.flatMap(a=>[a.sys,a.dia,a.hr])),X=i=>p.l+(r.length===1?0:(w-p.l-p.r)*i/(r.length-1)),Y=v=>h-p.b-(v-40)*(h-p.t-p.b)/(max-40);[['sys','#2563eb',[]],['dia','#dc2626',[8,5]],['hr','#16a34a',[2,4]]].forEach(([k,col,dash])=>{x.beginPath();x.strokeStyle=col;x.lineWidth=2.7;x.setLineDash(dash);r.forEach((a,i)=>i?x.lineTo(X(i),Y(a[k])):x.moveTo(X(i),Y(a[k])));x.stroke();x.setLineDash([])})}
function cell(v){let s=String(v??'');return/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function buildCSV(records=load()){let rows=[['record_id','timestamp_iso','日期','時間','收縮壓','舒張壓','心跳','備註']];records.sort((a,b)=>new Date(a.time)-new Date(b.time)).forEach(r=>{let d=new Date(r.time);rows.push([r.id,r.time,d.toLocaleDateString('zh-TW'),d.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}),r.sys,r.dia,r.hr,r.note||''])});return'\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')}
function parseCSV(text){let lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean),out=[];for(let line of lines.slice(1)){let c=[],cur='',q=false;for(let i=0;i<line.length;i++){let ch=line[i];if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=!q;else if(ch===','&&!q){c.push(cur);cur=''}else cur+=ch}c.push(cur);if(c.length>=8&&!isNaN(Date.parse(c[1])))out.push({id:c[0],time:new Date(c[1]).toISOString(),sys:+c[4],dia:+c[5],hr:+c[6],note:c[7]||''})}return out}
function download(){let b=new Blob([buildCSV()],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='BloodPressure.csv';a.click();URL.revokeObjectURL(u)}
$('form').onsubmit=async e=>{e.preventDefault();let id=$('editId').value,r=load(),obj={id:id||crypto.randomUUID(),time:id?(r.find(x=>x.id===id)?.time||new Date().toISOString()):new Date().toISOString(),sys:+$('sys').value,dia:+$('dia').value,hr:+$('hr').value,note:$('note').value.trim()},i=r.findIndex(x=>x.id===id);if(i>=0)r[i]=obj;else r.push(obj);save(r);cancel();render();$('status').className='status ok';$('status').textContent='✅ 已儲存。';if($('autoSync').checked){try{await syncDrive()}catch(e){showError(e)}}};
$('cancelBtn').onclick=cancel;$('connectBtn').onclick=()=>ensureToken(true).then(()=>syncDrive()).catch(showError);$('syncBtn').onclick=()=>syncDrive().catch(showError);$('disconnectBtn').onclick=()=>{if(accessToken)google.accounts.oauth2.revoke(accessToken);accessToken='';tokenExpiresAt=0;$('syncBtn').disabled=true;$('disconnectBtn').classList.add('hidden');setDriveStatus('已中斷 Google Drive 連線。')};
$('range').onchange=render;$('search').oninput=render;$('sort').onchange=render;$('exportBtn').onclick=download;$('importInput').onchange=async e=>{let f=e.target.files[0];if(!f)return;let inc=parseCSV(await f.text());save(mergeRecords(load(),inc));render();alert(`已匯入 ${inc.length} 筆`)};
$('clearBtn').onclick=()=>{if(confirm('確定清除本機紀錄？Google Drive 檔案不會被刪除。')){localStorage.removeItem(KEY);render()}};$('themeBtn').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem(THEME,document.documentElement.dataset.theme);render()};document.documentElement.dataset.theme=localStorage.getItem(THEME)||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');render();window.addEventListener('load',initGoogle);