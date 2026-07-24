"use strict";
const C=BP_CONFIG,$=id=>document.getElementById(id),K="bp11_records",FID="bp11_file_id",FNAME="bp11_file_name",MID="bp11_meta_file_id",TK="bp11_theme",LSYNC="bp11_last_sync",PENDING="bp11_pending_changes",SNAPSHOT="bp11_pre_upgrade_snapshot";
let token="",expires=0,client=null,pickerReady=false,syncing=false;let historyPageSize="10",historyVisibleCount=10;
let formDirty=false,restoringSession=false;
const now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random();
function pendingIds(){try{return JSON.parse(localStorage.getItem(PENDING)||"[]")}catch{return[]}}
function savePending(ids){localStorage.setItem(PENDING,JSON.stringify([...new Set(ids)]))}
function markPending(id){savePending([...pendingIds(),id]);updatePendingUi()}
function clearPending(){localStorage.removeItem(PENDING);updatePendingUi()}
function updatePendingUi(){const n=pendingIds().length,l=$("pendingSyncLabel");if(!l)return;l.textContent=`本機待同步：${n} 筆`;l.classList.toggle("pending-warning",n>0)}
function saveUpgradeSnapshot(){if(localStorage.getItem(SNAPSHOT))return;localStorage.setItem(SNAPSHOT,JSON.stringify({createdAt:now(),records:load(),fileId:fileId(),fileName:fileName(),metaFileId:metaFileId(),lastSync:localStorage.getItem(LSYNC)||""}))}

const load=()=>{try{let raw=localStorage.getItem(K);if(!raw){raw=localStorage.getItem("bp10_records")||localStorage.getItem("bp9_records");if(raw)localStorage.setItem(K,raw)}return JSON.parse(raw||"[]")}catch{return[]}},save=r=>localStorage.setItem(K,JSON.stringify(r));
const fileId=()=>localStorage.getItem(FID)||localStorage.getItem("bp10_file_id")||localStorage.getItem("bp9_file_id")||"",fileName=()=>localStorage.getItem(FNAME)||localStorage.getItem("bp10_file_name")||localStorage.getItem("bp9_file_name")||"",metaFileId=()=>localStorage.getItem(MID)||localStorage.getItem("bp10_meta_file_id")||"";function setMetaFileId(id){id?localStorage.setItem(MID,id):localStorage.removeItem(MID)}let toastTimer=0;function showToast(message){const t=$("toast");clearTimeout(toastTimer);t.textContent=message;t.classList.remove("hidden");t.classList.add("show");toastTimer=setTimeout(()=>{t.classList.remove("show");t.classList.add("hidden")},2200)}function setLastSync(){localStorage.setItem(LSYNC,new Date().toISOString())}function formatLastSync(){const v=localStorage.getItem(LSYNC);return v?`最後同步：${fmt(v)}`:"尚未同步";}
function setFile(id,name){localStorage.setItem(FID,id);localStorage.setItem(FNAME,name||C.FILE_NAME);ui()}
function clearFile(){localStorage.removeItem(FID);localStorage.removeItem(FNAME);localStorage.removeItem(MID);ui()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmt(t){return new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(t))}
function cls(s,d){if(s>=180||d>=120)return["bad","非常高","⚠️ 數值非常高；如有不適請立即就醫。"];if(s>=140||d>=90)return["warn","偏高","⚠️ 血壓偏高，建議休息後重測。"];if(s<90||d<60)return["warn","偏低","⚠️ 血壓偏低；如有不適請諮詢醫師。"];if(s>=130||d>=80)return["warn","稍高","ℹ️ 數值稍高，已完成紀錄。"];return["ok","一般範圍","✅ 紀錄已儲存。"]}
function driveMsg(m,bad=false){$("driveStatus").textContent=m;$("driveStatus").style.color=bad?"var(--danger)":""}
function ui(){
  const f=fileId(),signedIn=Boolean(token)&&Date.now()<expires,hasFile=Boolean(f),busy=syncing;
  $("login").classList.toggle("hidden",signedIn);
  $("login").textContent=hasFile?"重新連線 Google":"登入 Google";
  $("topLoginArea").classList.toggle("hidden",signedIn);
  $("driveManageSection").classList.toggle("hidden",!signedIn);
  $("pick").textContent=hasFile?"更換同步檔案":"選擇既有 CSV";
  $("pick").disabled=!signedIn||!pickerReady||busy;
  $("create").classList.toggle("hidden",hasFile);
  $("create").disabled=!signedIn||busy;
  $("sync").classList.toggle("hidden",!hasFile);
  $("sync").disabled=!signedIn||!hasFile||busy;
  $("forget").classList.toggle("hidden",!hasFile);
  $("forget").disabled=busy;
  $("logout").disabled=busy;
  $("autoSyncRow").classList.toggle("hidden",!hasFile);
  $("fileBox").classList.toggle("hidden",!hasFile);
  $("fileName").textContent=fileName()||C.FILE_NAME;
  $("fileId").textContent=f?"已綁定固定 Google Drive 檔案":"";
  $("lastSyncTime").textContent=formatLastSync();updatePendingUi();
  const badge=$("connectionBadge");
  badge.className="connection-badge "+(busy?"syncing":signedIn?"signed-in":"signed-out");
  badge.textContent=busy?"同步中":signedIn?"已登入":hasFile?"需重新連線":"未登入";
  if(!signedIn){
    driveMsg(hasFile?"已保留同步檔案，請重新連線 Google。":"尚未登入 Google。");
  }else if(!hasFile){
    driveMsg("已登入 Google。請到頁面下方的『Google Drive 管理』選擇或建立 CSV。");
  }else if(!busy){
    driveMsg(`已連線：${fileName()||C.FILE_NAME}`);
  }
}
function defaults(force=false){
  if(!force && ($("editId").value || formDirty))return;
  const d=new Date(),l=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  $("date").value=l.toISOString().slice(0,10);
  $("time").value=l.toISOString().slice(11,16);
}
function initGoogle(){
  if(!window.google?.accounts?.oauth2||!window.gapi){setTimeout(initGoogle,250);return}
  gapi.load("picker",{callback:()=>{pickerReady=true;ui()}});
  client=google.accounts.oauth2.initTokenClient({
    client_id:C.CLIENT_ID,
    scope:C.SCOPE,
    callback:()=>{},
    error_callback:e=>{
      const type=e?.type||"unknown";
      if(restoringSession){restoringSession=false;ui();return}
      if(type==="popup_failed_to_open")driveMsg("Google 登入視窗無法開啟。請允許彈出式視窗，或使用 Safari/Chrome 開啟網站。",true);
      else if(type==="popup_closed")driveMsg("Google 登入視窗已關閉，尚未完成授權。",true);
      else driveMsg("Google 登入發生錯誤："+type,true)
    }
  });
  ui();
  restoreGoogleSession();
}
async function restoreGoogleSession(){
  if(!fileId()||!client||restoringSession)return;
  restoringSession=true;
  try{
    await auth(false);
    restoringSession=false;
    ui();
    await syncDrive();
  }catch{
    restoringSession=false;
    token="";expires=0;ui();
  }
}
function auth(interactive=true){return new Promise((res,rej)=>{if(token&&Date.now()<expires)return res(token);if(!client)return rej(Error("Google 元件尚未載入"));client.callback=r=>{if(r.error)return rej(Error(r.error_description||r.error));token=r.access_token;expires=Date.now()+(Number(r.expires_in||3600)-60)*1000;restoringSession=false;driveMsg("Google Drive 已登入。");ui();res(token)};client.requestAccessToken({prompt:interactive?"consent":""})})}
async function api(url,opt={}){let t=await auth(false),r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:"Bearer "+t}});if(!r.ok){let m=await r.text();if(r.status===401){token="";expires=0;ui()}throw Error("Drive API "+r.status+": "+m)}return r}
function picker(){if(!token)return driveMsg("請先登入 Google。",true);let v=new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes("text/csv,text/plain,application/vnd.ms-excel").setIncludeFolders(false);new google.picker.PickerBuilder().setAppId(C.APP_ID).setOAuthToken(token).setDeveloperKey(C.API_KEY).addView(v).setTitle("選擇 BloodPressure.csv").setCallback(async d=>{if(d.action!==google.picker.Action.PICKED)return;let f=d.docs?.[0];if(!f)return;setFile(f.id,f.name);try{await syncDrive()}catch(e){syncError(e)}}).build().setVisible(true)}
function cell(v){v=String(v??"");return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function csv(records=load()){let a=[["日期","時間","收縮壓","舒張壓","心跳","備註"]];records.filter(r=>!r.deleted).sort((x,y)=>new Date(x.time)-new Date(y.time)).forEach(r=>{let d=new Date(r.time);a.push([d.toLocaleDateString("zh-TW"),d.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit",hour12:false}),r.sys,r.dia,r.hr,r.note||""])});return"\ufeff"+a.map(r=>r.map(cell).join(",")).join("\r\n")}
function parse(text){let lines=text.replace(/^\ufeff/,"").split(/\r?\n/).filter(Boolean),out=[];for(let line of lines.slice(1)){let c=[],x="",q=false;for(let i=0;i<line.length;i++){let ch=line[i];if(ch=='"'&&line[i+1]=='"'){x+='"';i++}else if(ch=='"')q=!q;else if(ch==","&&!q){c.push(x);x=""}else x+=ch}c.push(x);if(c.length>=5){let d=new Date(c[0]+" "+c[1]);if(!isNaN(d)&&[+c[2],+c[3],+c[4]].every(Number.isFinite)){out.push({id:uid(),time:d.toISOString(),updatedAt:now(),deleted:false,sys:+c[2],dia:+c[3],hr:+c[4],note:c[5]||""});continue}}if(c.length>=10&&c[0]&&!isNaN(Date.parse(c[1])))out.push({id:c[0],time:new Date(c[1]).toISOString(),updatedAt:!isNaN(Date.parse(c[2]))?new Date(c[2]).toISOString():c[1],deleted:c[3]=="1"||c[3]=="true",sys:+c[6],dia:+c[7],hr:+c[8],note:c[9]||""})}return out.filter(r=>[r.sys,r.dia,r.hr].every(Number.isFinite))}
function merge(a,b){let m=new Map;[...b,...a].forEach(r=>{let e=m.get(r.id);if(!e||Date.parse(r.updatedAt||r.time)>=Date.parse(e.updatedAt||e.time))m.set(r.id,r)});return[...m.values()].sort((x,y)=>new Date(x.time)-new Date(y.time))}
function meta(records=load()){return JSON.stringify({format:"BloodPressureSync",version:10,updatedAt:now(),records},null,2)}
function parseMeta(text){try{let d=JSON.parse(text);return d?.format=="BloodPressureSync"&&Array.isArray(d.records)?d.records:[]}catch{return[]}}
async function parentOf(id){let r=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=parents`),d=await r.json();return d.parents?.[0]||""}
async function findMeta(parent){let id=metaFileId();if(id)return id;let q=`name='${C.META_FILE_NAME}' and trashed=false`;if(parent)q+=` and '${parent}' in parents`;let r=await api("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent(q)+"&fields=files(id)&pageSize=10"),d=await r.json();if(d.files?.[0]?.id){setMetaFileId(d.files[0].id);return d.files[0].id}return""}
async function createMeta(parent,records){let b="bp10_"+Date.now(),m={name:C.META_FILE_NAME,mimeType:"application/json",appProperties:{app:"BloodPressurePWA",version:"10",type:"sync-meta"}};if(parent)m.parents=[parent];let body=`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(m)}\r\n--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta(records)}\r\n--${b}--`;let r=await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+b},body}),f=await r.json();setMetaFileId(f.id);return f.id}
async function remoteMeta(csvId){let p=await parentOf(csvId),id=await findMeta(p);if(!id)return[];let r=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`);return parseMeta(await r.text())}
async function saveMeta(csvId,records){let p=await parentOf(csvId),id=await findMeta(p);if(!id)await createMeta(p,records);else await api(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`,{method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:meta(records)})}
async function createFile(){await auth(false);let boundary="bp9_"+Date.now(),meta={name:C.FILE_NAME,mimeType:"text/csv",description:"BloodPressure PWA V9 sync file",appProperties:{app:"BloodPressurePWA",version:"9"}},body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${csv()}\r\n--${boundary}--`;let r=await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body}),f=await r.json();setFile(f.id,f.name);await createMeta("",load());await syncDrive()}
async function syncDrive(){if(syncing)return;let id=fileId();if(!id)return driveMsg("請先選擇或建立同步檔案。",true);syncing=true;ui();driveMsg("正在同步 Google Drive，請稍候…");try{let remote=await remoteMeta(id);if(!remote.length){let r=await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`);remote=parse(await r.text())}let all=merge(load(),remote);save(all);await api(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`,{method:"PATCH",headers:{"Content-Type":"text/csv; charset=UTF-8"},body:csv(all)});await saveMeta(id,all);clearPending();if(typeof setLastSync=="function")setLastSync();render();driveMsg(`同步完成，共 ${all.filter(x=>!x.deleted).length} 筆。`);if(typeof showToast=="function")showToast("✅ 已同步到 Google Drive")}finally{syncing=false;ui()}}
function syncError(e){console.error(e);let m=String(e.message||e);if(m.includes("404")){clearFile();driveMsg("找不到同步檔案，請重新選擇。",true)}else if(m.includes("401")){token="";expires=0;ui();driveMsg("授權已到期，請重新登入。",true)}else if(!navigator.onLine)driveMsg("目前離線，資料已保存在本機。",true);else driveMsg("同步失敗："+m,true);updatePendingUi()}
async function auto(){if(!$("autoSync").checked||!fileId())return;if(!token||Date.now()>=expires)return driveMsg("已存本機；請重新登入後同步。",true);try{await syncDrive()}catch(e){syncError(e)}}
function active(){return load().filter(r=>!r.deleted)}
function render(){let all=active().sort((a,b)=>new Date(b.time)-new Date(a.time)),last=all[0],n=new Date();$("latest").textContent=last?`${last.sys}/${last.dia}`:"—";$("latestTime").textContent=last?fmt(last.time):"尚無紀錄";$("count").textContent=all.length;$("month").textContent=`本月 ${all.filter(r=>{let d=new Date(r.time);return d.getFullYear()==n.getFullYear()&&d.getMonth()==n.getMonth()}).length} 筆`;if(all.length){$("average").textContent=`${Math.round(all.reduce((s,r)=>s+r.sys,0)/all.length)}/${Math.round(all.reduce((s,r)=>s+r.dia,0)/all.length)}`;$("avgHr").textContent=`平均心跳 ${Math.round(all.reduce((s,r)=>s+r.hr,0)/all.length)}`;$("state").textContent=cls(last.sys,last.dia)[1]}else{$("average").textContent="—";$("avgHr").textContent="平均心跳 —";$("state").textContent="—"}let q=$("search").value.toLowerCase(),sf=$("historyStateFilter").value,df=$("historyDateFrom").value,dt=$("historyDateTo").value,allRows=[...all].sort((a,b)=>($("sort").value=="asc"?1:-1)*(new Date(a.time)-new Date(b.time))).filter(r=>{if(q&&![fmt(r.time),r.sys,r.dia,r.hr,r.note].join(" ").toLowerCase().includes(q))return false;let st=cls(r.sys,r.dia)[0];if(sf==="abnormal"&&st==="ok")return false;if(sf==="normal"&&st!=="ok")return false;let day=new Date(r.time);if(df&&day<new Date(df+"T00:00:00"))return false;if(dt&&day>new Date(dt+"T23:59:59"))return false;return true}),rows=historyPageSize==="all"?allRows:allRows.slice(0,historyVisibleCount),tb=$("history").querySelector("tbody");tb.innerHTML=rows.map(r=>{let c=cls(r.sys,r.dia);return`<tr><td>${fmt(r.time)}</td><td><b>${r.sys}/${r.dia}</b></td><td>${r.hr}</td><td><span class="pill ${c[0]}">${c[1]}</span></td><td>${esc(r.note)}</td><td><div class="row"><button data-e="${r.id}">編輯</button><button data-d="${r.id}" class="danger">刪除</button></div></td></tr>`}).join("");$("history").classList.toggle("hidden",!rows.length);$("empty").classList.toggle("hidden",!!rows.length);$("historyCountLabel").textContent=`共 ${allRows.length} 筆`;$("historySummaryLabel").textContent=historyPageSize==="all"?"全部":`${historyPageSize} 筆`;$("historyShownLabel").textContent=`目前顯示 ${rows.length} / ${allRows.length} 筆`;$("loadMoreHistory").classList.toggle("hidden",historyPageSize==="all"||rows.length>=allRows.length);tb.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>edit(b.dataset.e));tb.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>del(b.dataset.d));draw(all.slice(0,+$("range").value).reverse());ui()}
function edit(id){formDirty=false;let r=load().find(x=>x.id==id&&!x.deleted);if(!r)return;let d=new Date(r.time),l=new Date(d-d.getTimezoneOffset()*60000);$("editId").value=id;$("date").value=l.toISOString().slice(0,10);$("time").value=l.toISOString().slice(11,16);$("sys").value=r.sys;$("dia").value=r.dia;$("hr").value=r.hr;$("note").value=r.note;$("formTitle").textContent="編輯紀錄";$("save").textContent="更新紀錄";$("cancel").classList.remove("hidden");scrollTo({top:0,behavior:"smooth"})}
function cancel(){$("form").reset();$("editId").value="";formDirty=false;$("formTitle").textContent="新增紀錄";$("save").textContent="儲存紀錄";$("cancel").classList.add("hidden");defaults(true)}
async function del(id){if(!confirm("確定刪除這筆紀錄？"))return;let r=load(),i=r.findIndex(x=>x.id==id);if(i<0)return;r[i]={...r[i],deleted:true,updatedAt:now()};save(r);markPending(id);render();await auto()}
function draw(r){let c=$("chart"),x=c.getContext("2d"),w=c.width,h=c.height,dark=document.documentElement.dataset.theme=="dark";x.clearRect(0,0,w,h);x.fillStyle=dark?"#0f1c2e":"#fff";x.fillRect(0,0,w,h);if(!r.length){x.fillStyle="#64748b";x.font="22px sans-serif";x.fillText("尚無資料",w/2-45,h/2);return}let p={l:48,r:16,t:20,b:35},max=Math.max(180,...r.flatMap(a=>[a.sys,a.dia,a.hr])),X=i=>p.l+(r.length==1?0:(w-p.l-p.r)*i/(r.length-1)),Y=v=>h-p.b-(v-40)*(h-p.t-p.b)/(max-40);[["sys","#2563eb",[]],["dia","#dc2626",[8,5]],["hr","#16a34a",[2,4]]].forEach(([k,col,dash])=>{x.beginPath();x.strokeStyle=col;x.lineWidth=2.7;x.setLineDash(dash);r.forEach((a,i)=>i?x.lineTo(X(i),Y(a[k])):x.moveTo(X(i),Y(a[k])));x.stroke();x.setLineDash([])})}
$("form").onsubmit=async e=>{e.preventDefault();let id=$("editId").value,t=new Date(`${$("date").value}T${$("time").value}:00`),r=load(),o={id:id||uid(),time:t.toISOString(),updatedAt:now(),deleted:false,sys:+$("sys").value,dia:+$("dia").value,hr:+$("hr").value,note:$("note").value.trim()},i=r.findIndex(x=>x.id==id);i>=0?r[i]=o:r.push(o);save(r);markPending(o.id);let c=cls(o.sys,o.dia);cancel();render();$("status").className="status "+c[0];$("status").textContent=c[2];await auto()};
$("login").onclick=async()=>{try{await auth(true);if(!fileId())$("first").showModal();else await syncDrive()}catch(e){driveMsg("登入失敗："+e.message,true)}};$("pick").onclick=picker;$("dPick").onclick=()=>{$("first").close();picker()};$("create").onclick=()=>createFile().catch(syncError);$("dCreate").onclick=()=>{$("first").close();$("create").click()};$("sync").onclick=()=>syncDrive().catch(syncError);$("forget").onclick=()=>{if(confirm("解除目前檔案綁定？檔案不會刪除。"))clearFile()};$("logout").onclick=()=>{if(token)google.accounts.oauth2.revoke(token);token="";expires=0;$("driveManage").open=false;ui();driveMsg("已登出 Google。")};$("cancel").onclick=cancel;$("range").onchange=render;$("search").oninput=()=>{historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("sort").onchange=()=>{historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};document.querySelectorAll("[data-note]").forEach(b=>b.onclick=()=>$("note").value=b.dataset.note);
$("export").onclick=()=>{let b=new Blob([csv()],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=C.FILE_NAME;a.click();URL.revokeObjectURL(u)};$("exportJson").onclick=()=>{let backup={app:"BloodPressure",version:11,exportedAt:now(),records:load(),sync:{fileId:fileId(),fileName:fileName(),metaFileId:metaFileId(),lastSync:localStorage.getItem(LSYNC)||"",pendingIds:pendingIds()}},b=new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=`BloodPressure_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u)};$("importJson").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let b=JSON.parse(await f.text());if(b?.app!=="BloodPressure"||!Array.isArray(b.records))throw Error("不是有效的 BloodPressure 備份");if(!confirm(`要復原 ${b.records.length} 筆紀錄嗎？目前資料會合併保留。`))return;let m=merge(load(),b.records);save(m);savePending([...pendingIds(),...b.records.map(r=>r.id).filter(Boolean)]);render();showToast("✅ JSON 備份已復原");await auto()}catch(err){alert("JSON 復原失敗："+err.message)}e.target.value=""};$("import").onchange=async e=>{let f=e.target.files[0];if(!f)return;let inc=parse(await f.text()),m=merge(load(),inc);save(m);savePending([...pendingIds(),...inc.map(x=>x.id)]);render();alert(`已匯入 ${inc.length} 筆`);e.target.value="";await auto()};$("historyPageSize").onchange=()=>{historyPageSize=$("historyPageSize").value;historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("historyStateFilter").onchange=()=>{historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("historyDateFrom").onchange=()=>{historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("historyDateTo").onchange=()=>{historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("clearHistoryFilters").onclick=()=>{$("historyStateFilter").value="all";$("historyDateFrom").value="";$("historyDateTo").value="";$("search").value="";historyVisibleCount=historyPageSize==="all"?Number.MAX_SAFE_INTEGER:Number(historyPageSize);render()};$("loadMoreHistory").onclick=()=>{if(historyPageSize!=="all"){historyVisibleCount+=Number(historyPageSize);render()}};
$("clear").onclick=()=>{if(confirm("清除本機快取？Drive 檔案不會刪除。")){localStorage.removeItem(K);render()}};$("theme").onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme=="dark"?"light":"dark";localStorage.setItem(TK,document.documentElement.dataset.theme);render()};
["sys","dia","hr","note","date","time"].forEach(id=>{
  $(id).addEventListener("input",()=>{if(!$("editId").value)formDirty=true});
});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")defaults(false);
});
window.addEventListener("pageshow",()=>defaults(false));
window.addEventListener("focus",()=>defaults(false));
document.documentElement.dataset.theme=localStorage.getItem(TK)||localStorage.getItem("bp10_theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
saveUpgradeSnapshot();defaults(true);render();
const ABOUT_OPEN_KEY="bp11_about_open";
const aboutSection=$("aboutBloodPressure");
if(aboutSection){
  const savedAboutState=localStorage.getItem(ABOUT_OPEN_KEY);
  if(savedAboutState!==null)aboutSection.open=savedAboutState==="1";
  aboutSection.addEventListener("toggle",()=>{
    localStorage.setItem(ABOUT_OPEN_KEY,aboutSection.open?"1":"0");
  });
}
window.addEventListener("online",()=>{updatePendingUi();if(pendingIds().length&&token&&fileId())syncDrive().catch(syncError)});window.addEventListener("offline",()=>driveMsg("目前離線，變更會先保存在本機。",true));window.addEventListener("load",initGoogle);if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
