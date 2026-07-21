
const KEY='bloodPressureRecordsV2';
const THEME_KEY='bloodPressureTheme';
const $=id=>document.getElementById(id);

function loadRecords(){
  try{return JSON.parse(localStorage.getItem(KEY)||'[]')}
  catch{return[]}
}
function saveRecords(records){localStorage.setItem(KEY,JSON.stringify(records))}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function formatDateTime(iso){
  return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))
}
function classify(sys,dia){
  if(sys>=180||dia>=120)return{key:'danger',label:'非常高',message:'⚠️ 數值非常高；若伴隨不適，請立即尋求醫療協助。'}
  if(sys>=140||dia>=90)return{key:'warn',label:'偏高',message:'⚠️ 血壓偏高，建議休息後重測並依醫師指示處理。'}
  if(sys<90||dia<60)return{key:'warn',label:'偏低',message:'⚠️ 血壓偏低；若有暈眩或不適，請諮詢醫師。'}
  if(sys>=130||dia>=80)return{key:'warn',label:'稍高',message:'ℹ️ 數值稍高，已完成紀錄。'}
  return{key:'ok',label:'一般範圍',message:'✅ 紀錄已儲存。'}
}
function filteredRecords(){
  const q=$('searchInput').value.trim().toLowerCase();
  let records=loadRecords();
  records.sort((a,b)=>$('sortOrder').value==='asc'?new Date(a.time)-new Date(b.time):new Date(b.time)-new Date(a.time));
  if(!q)return records;
  return records.filter(r=>{
    const c=classify(r.sys,r.dia);
    return [formatDateTime(r.time),r.sys,r.dia,r.hr,r.note,c.label].join(' ').toLowerCase().includes(q)
  })
}
function render(){
  const all=loadRecords().sort((a,b)=>new Date(b.time)-new Date(a.time));
  const latest=all[0];
  $('latestBp').textContent=latest?`${latest.sys}/${latest.dia}`:'—';
  $('latestTime').textContent=latest?formatDateTime(latest.time):'尚無紀錄';
  if(all.length){
    const avgS=Math.round(all.reduce((s,r)=>s+r.sys,0)/all.length);
    const avgD=Math.round(all.reduce((s,r)=>s+r.dia,0)/all.length);
    const avgH=Math.round(all.reduce((s,r)=>s+r.hr,0)/all.length);
    $('avgBp').textContent=`${avgS}/${avgD}`;
    $('avgHr').textContent=`平均心跳 ${avgH}`;
    $('latestClass').textContent=classify(latest.sys,latest.dia).label;
  }else{
    $('avgBp').textContent='—';$('avgHr').textContent='平均心跳 —';$('latestClass').textContent='—';
  }
  const now=new Date();
  const monthCount=all.filter(r=>{const d=new Date(r.time);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length;
  $('monthCount').textContent=monthCount;
  $('totalCount').textContent=`總計 ${all.length} 筆`;

  const records=filteredRecords();
  const tbody=$('historyTable').querySelector('tbody');
  tbody.innerHTML=records.map(r=>{
    const c=classify(r.sys,r.dia);
    return `<tr>
      <td>${escapeHtml(formatDateTime(r.time))}</td>
      <td><strong>${r.sys}/${r.dia}</strong></td>
      <td>${r.hr}</td>
      <td><span class="state-pill state-${c.key}">${c.label}</span></td>
      <td>${escapeHtml(r.note||'')}</td>
      <td><div class="row-actions">
        <button data-edit="${r.id}">編輯</button>
        <button data-delete="${r.id}" class="delete">刪除</button>
      </div></td>
    </tr>`
  }).join('');
  $('historyTable').classList.toggle('hidden',!records.length);
  $('emptyState').classList.toggle('hidden',!!records.length);
  tbody.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
  tbody.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete));

  const range=Number($('chartRange').value);
  drawChart(all.slice(0,range).reverse());
}
function startEdit(id){
  const r=loadRecords().find(x=>x.id===id);if(!r)return;
  $('editId').value=id;$('sys').value=r.sys;$('dia').value=r.dia;$('hr').value=r.hr;$('note').value=r.note||'';
  $('saveBtn').textContent='更新紀錄';$('cancelEditBtn').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
function cancelEdit(){
  $('bpForm').reset();$('editId').value='';$('saveBtn').textContent='儲存紀錄';$('cancelEditBtn').classList.add('hidden');
}
function deleteRecord(id){
  if(!confirm('確定要刪除這筆紀錄？'))return;
  saveRecords(loadRecords().filter(r=>r.id!==id));render();
}
function drawChart(records){
  const c=$('chart'),ctx=c.getContext('2d'),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  const dark=document.documentElement.dataset.theme==='dark';
  ctx.fillStyle=dark?'#0f1c2e':'#ffffff';ctx.fillRect(0,0,w,h);
  if(!records.length){ctx.fillStyle=dark?'#9fb0c7':'#64748b';ctx.font='22px sans-serif';ctx.fillText('尚無資料',w/2-45,h/2);return}
  const pad={l:52,r:18,t:22,b:42},min=40,max=Math.max(180,...records.flatMap(r=>[r.sys,r.dia,r.hr]));
  const X=i=>pad.l+(records.length===1?0:(w-pad.l-pad.r)*i/(records.length-1));
  const Y=v=>h-pad.b-(v-min)*(h-pad.t-pad.b)/(max-min);
  ctx.font='12px sans-serif';
  [60,90,120,150,180].forEach(v=>{
    ctx.strokeStyle=dark?'#26384f':'#e2e8f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,Y(v));ctx.lineTo(w-pad.r,Y(v));ctx.stroke();
    ctx.fillStyle=dark?'#9fb0c7':'#64748b';ctx.fillText(v,10,Y(v)+4)
  });
  const series=[['sys','#2563eb',[],3],['dia','#dc2626',[9,6],2.7],['hr','#16a34a',[2,5],2.5]];
  series.forEach(([key,color,dash,width])=>{
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
    records.forEach((r,i)=>i?ctx.lineTo(X(i),Y(r[key])):ctx.moveTo(X(i),Y(r[key])));
    ctx.stroke();ctx.setLineDash([])
  });
}

async function shareToICloud(){
  const filename='BloodPressure.csv';
  const file=new File([buildCSV()],filename,{type:'text/csv'});
  if(navigator.canShare?.({files:[file]})){
    try{
      await navigator.share({title:'血壓紀錄 iCloud 備份',files:[file]});
      return true;
    }catch(err){
      if(err?.name!=='AbortError') console.error(err);
      return false;
    }
  }
  downloadCSV();
  alert('已下載 CSV。請在下載項目中選「分享」→「儲存到檔案」→ iCloud Drive。');
  return false;
}

function csvEscape(v){
  const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s
}
function buildCSV(){
  const rows=[['日期','時間','收縮壓','舒張壓','心跳','狀態','備註']];
  loadRecords().sort((a,b)=>new Date(a.time)-new Date(b.time)).forEach(r=>{
    const d=new Date(r.time),c=classify(r.sys,r.dia);
    rows.push([d.toLocaleDateString('zh-TW'),d.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}),r.sys,r.dia,r.hr,c.label,r.note||''])
  });
  return '\ufeff'+rows.map(row=>row.map(csvEscape).join(',')).join('\r\n')
}
function downloadCSV(){
  const blob=new Blob([buildCSV()],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='BloodPressure.csv';a.click();URL.revokeObjectURL(url)
}
function parseCSV(text){
  const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean),rows=[];
  for(const line of lines.slice(1)){
    const cells=[];let cur='',quote=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}
      else if(ch==='"'){quote=!quote}
      else if(ch===','&&!quote){cells.push(cur);cur=''}
      else cur+=ch
    }
    cells.push(cur);
    if(cells.length>=5){
      const hasState=cells.length>=7;
      const dateText=`${cells[0]} ${cells[1]}`;
      const d=new Date(dateText);
      if(Number.isNaN(d.getTime()))continue;
      rows.push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),time:d.toISOString(),sys:Number(cells[2]),dia:Number(cells[3]),hr:Number(cells[4]),note:hasState?(cells[6]||''):(cells[5]||'')})
    }
  }
  return rows
}
$('bpForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const sys=Number($('sys').value),dia=Number($('dia').value),hr=Number($('hr').value),note=$('note').value.trim(),editId=$('editId').value;
  const records=loadRecords();
  if(editId){
    const i=records.findIndex(r=>r.id===editId);
    if(i>=0)records[i]={...records[i],sys,dia,hr,note};
  }else{
    records.push({id:crypto.randomUUID?.()||String(Date.now()),time:new Date().toISOString(),sys,dia,hr,note})
  }
  saveRecords(records);
  const c=classify(sys,dia);$('status').className=`status ${c.key}`;$('status').textContent=c.message;
  const shouldBackup=$('autoICloud')?.checked;
  cancelEdit();render();
  if(shouldBackup) await shareToICloud();
});
$('cancelEditBtn').onclick=cancelEdit;
$('chartRange').onchange=render;$('searchInput').oninput=render;$('sortOrder').onchange=render;
$('icloudBtn').onclick=shareToICloud;
$('exportBtn').onclick=downloadCSV;
$('shareBtn').onclick=shareToICloud;
$('importInput').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const incoming=parseCSV(await file.text());
  if(!incoming.length){alert('找不到可匯入的紀錄');return}
  const mode=confirm(`找到 ${incoming.length} 筆紀錄。\n按「確定」合併；按「取消」取代現有資料。`);
  saveRecords(mode?[...loadRecords(),...incoming]:incoming);render();alert(`已匯入 ${incoming.length} 筆紀錄`)
};
$('clearBtn').onclick=()=>{if(confirm('確定要清除全部紀錄？此動作無法復原。')){localStorage.removeItem(KEY);render()}};
function applyTheme(theme){
  document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);render()
}
$('themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
applyTheme(localStorage.getItem(THEME_KEY)||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
render();
