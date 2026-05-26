let db = window.dietDataManager.data;
function save(){ window.dietDataManager.data = db; window.dietDataManager.save();  }
function ensureDay(d){ return window.dietDataManager.ensureDay(d); }
function lastWeight(day){if(!day.weights.length)return '--';return day.weights[day.weights.length-1].weight+' kg';}
function mealCount(day){return mealTypes.reduce((n,m)=>n+day.meals[m].images.length,0)}
function goalDone(day){return [day.goals.diet,day.goals.exercise,day.goals.sleep].filter(Boolean).length+'/3'}

function setTab(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));document.querySelector('#tab-'+tab).classList.add('on');document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.querySelector(`.nav[data-tab="${tab}"]`).classList.add('active');}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

function rows(){
  const from=document.getElementById('fromDate').value||'1900-01-01';
  const to=document.getElementById('toDate').value||'2999-12-31';
  return Object.values(db.days).filter(d=>d.date>=from&&d.date<=to).sort((a,b)=>b.date.localeCompare(a.date));
}
function renderList(){
  const tb=document.getElementById('listBody');
  const rs=rows();
  tb.innerHTML=rs.length?rs.map(d=>`<tr><td>${d.date}</td><td>${mealCount(d)} 张</td><td>${goalDone(d)}</td><td>${lastWeight(d)}</td><td><button data-date="${d.date}" class="goEdit">编辑</button></td></tr>`).join(''):'<tr><td colspan="5">暂无记录</td></tr>';
  tb.querySelectorAll('.goEdit').forEach(b=>b.onclick=()=>{setTab('edit');document.getElementById('editDate').value=b.dataset.date;loadEdit();});
}

function loadEdit(){
  const dstr=document.getElementById('editDate').value||today();
  const d=ensureDay(dstr);
  document.getElementById('editDateLabel').textContent='- '+dstr;
  document.getElementById('gDiet').checked=d.goals.diet;
  document.getElementById('gExercise').checked=d.goals.exercise;
  document.getElementById('gSleep').checked=d.goals.sleep;
  document.getElementById('dNote').value=d.note||'';
  document.getElementById('editMeals').innerHTML=mealTypes.map(m=>`<div class="panel" style="margin-bottom:8px"><b>${mealLabel[m]}</b><div class="mini">图片 ${d.meals[m].images.length}/3</div><textarea data-meal="${m}" class="mnote">${d.meals[m].note||''}</textarea></div>`).join('');
  const wl=document.getElementById('weightList');
  wl.innerHTML=d.weights.map((w,i)=>`<div class="row"><span class="chip">${new Date(w.at).toLocaleTimeString()}</span><span>${w.weight} kg</span><button data-i="${i}" class="delW">删</button></div>`).join('')||'<div class="mini">暂无体重记录</div>';
  wl.querySelectorAll('.delW').forEach(b=>b.onclick=()=>{d.weights.splice(Number(b.dataset.i),1);save();loadEdit();renderList();});
}

document.getElementById('btnLoadDate').onclick=loadEdit;
document.getElementById('btnFilter').onclick=renderList;
document.getElementById('btnReset').onclick=()=>{document.getElementById('fromDate').value='';document.getElementById('toDate').value='';renderList();};
document.getElementById('btnAddW').onclick=()=>{const d=ensureDay(document.getElementById('editDate').value||today());const v=Number(document.getElementById('newWeight').value);if(!v)return;d.weights.push({weight:v,at:new Date().toISOString()});save();loadEdit();renderList();};
document.getElementById('btnSaveEdit').onclick=()=>{const d=ensureDay(document.getElementById('editDate').value||today());d.goals.diet=document.getElementById('gDiet').checked;d.goals.exercise=document.getElementById('gExercise').checked;d.goals.sleep=document.getElementById('gSleep').checked;d.note=document.getElementById('dNote').value;document.querySelectorAll('.mnote').forEach(t=>d.meals[t.dataset.meal].note=t.value);save();renderList();alert('已保存');};

document.getElementById('startDate').value=db.settings.startDate||today();
const settingsHint=document.getElementById('settingsHint');
document.getElementById('btnSaveStart').onclick=()=>{
  db.settings.startDate=document.getElementById('startDate').value||today();
  save();
  settingsHint.className='mini ok';
  settingsHint.textContent='已保存。开始记录日变更后，Day X 将按新起点重算。';
};

document.getElementById('btnExport').onclick=()=>{
  const expFrom=document.getElementById('expFrom').value||'1900-01-01';
  const expTo=document.getElementById('expTo').value||'2999-12-31';
  const expPrefix=(document.getElementById('expPrefix').value||'diet_records').trim().replace(/[\\/:*?"<>|\\s]+/g,'_');
  const exportHint=document.getElementById('exportHint');
  if(expFrom>expTo){
    exportHint.className='mini warn';
    exportHint.textContent='导出失败：开始日期不能大于结束日期。';
    return;
  }
  const list=Object.values(db.days).filter(d=>d.date>=expFrom&&d.date<=expTo).sort((a,b)=>a.date.localeCompare(b.date));
  if(!list.length){
    exportHint.className='mini warn';
    exportHint.textContent='导出失败：所选时间范围内无记录。';
    return;
  }
  const lines=['date,diet_done,exercise_done,sleep_done,note,last_weight'];
  for(const d of list){const lw=d.weights.length?d.weights[d.weights.length-1].weight:'';lines.push(`${d.date},${d.goals.diet?1:0},${d.goals.exercise?1:0},${d.goals.sleep?1:0},"${(d.note||'').replaceAll('"','""')}",${lw}`)}
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,10);
  a.href=URL.createObjectURL(blob);
  a.download=`${expPrefix}_${expFrom}_to_${expTo}_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  exportHint.className='mini ok';
  exportHint.textContent=`导出成功：${list.length} 条记录。文件名已包含时间范围。`;
};

setTab('list'); renderList(); loadEdit();
document.getElementById('expFrom').value=today().slice(0,8)+'01';
document.getElementById('expTo').value=today();
document.getElementById('exportHint').textContent='说明：仅导出当前本地记录（CSV）。图片文件仍按本地数据目录管理。';



