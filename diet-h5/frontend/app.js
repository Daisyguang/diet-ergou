const app = document.getElementById('app');
const today = () => new Date().toISOString().slice(0, 10);
const meals = ['breakfast', 'lunch', 'dinner'];
const mealLabel = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
const mealEmoji = { breakfast: '🍳', lunch: '🥗', dinner: '🍲' };
const pet = {
  happy: './assets/pet_parts/expr_happy.png',
  wink: './assets/pet_parts/expr_wink.png',
  curious: './assets/pet_parts/expr_curious.png',
  satisfied: './assets/pet_parts/expr_satisfied.png',
  mainSit: './assets/pet_parts/main_sit.png',
  walk: './assets/pet_parts/act_walk.png',
  lie: './assets/pet_parts/act_lie.png',
  sleep: './assets/pet_parts/act_sleep.png',
  stretch: './assets/pet_parts/act_stretch.png',
  peek: './assets/pet_parts/inter_peek.png',
  follow: './assets/pet_parts/inter_follow.png',
  stare: './assets/pet_parts/inter_stare.png',
  think: './assets/pet_parts/inter_think.png'
};
const copies = [
  '昨天漏记啦，今天继续认真打卡',
  '昨天休息了一下，今天接着稳稳记录',
  '没关系，今天开始重新对齐节奏',
  '小断档很正常，继续就是进步',
  '今天补上记录，你已经在变好了',
  '别有压力，先完成今天这一条',
  '昨天没称重也没事，今天继续',
  '一步一步来，先把今天完成',
  '记录不求完美，只求持续',
  '继续保持，今天也会更轻一点'
];
const petTalks = ['二狗陪你打卡', '先吃好再冲刺', '今天也会更轻一点', '喝口水，继续加油', '我在这里看着你'];
const goalCheers = ['做得好，继续保持', '打卡成功，今天很稳', '又前进了一步', '你比昨天更自律', '很好，状态在线'];
let state = { page: 'today', date: today(), historyMonth: today().slice(0,7), data: window.dietDataManager.data };

function saveDB() {
  window.dietDataManager.data = state.data;
  window.dietDataManager.save();

}

function ensureDay(date){ return window.dietDataManager.ensureDay(date); }

function dayIndex(date){ return window.dietDataManager.dayIndex(date); }
function prevDate(date){ return window.dietDataManager.prevDate(date); }
function lastWeight(date){ return window.dietDataManager.lastWeight(date); }
function delta(date){ return window.dietDataManager.delta(date); }

function nav() {
  return `<div class="tabbar">
    <button class="tabbtn ${state.page === 'today' ? 'on' : ''}" onclick="go('today')">今日记录</button>
    <button class="tabbtn ${state.page === 'summary' ? 'on' : ''}" onclick="go('summary')">汇总预览</button>
    <button class="tabbtn ${state.page === 'history' ? 'on' : ''}" onclick="go('history')">历史记录</button>
  </div>`;
}

function cnWeekday(dateStr){
  const n = new Date(dateStr + 'T00:00:00').getDay();
  return ['周日','周一','周二','周三','周四','周五','周六'][n];
}

function shiftMonth(ym, step){
  const d = new Date(`${ym}-01T00:00:00`);
  d.setMonth(d.getMonth() + step);
  return d.toISOString().slice(0,7);
}

window.go = (page, date) => {
  state.page = page;
  if (date) state.date = date;
  render();
};

function mealCard(type, meal) {
  const noteText = (meal.note || '').trim();
  return `<div class="card">
    <div class="meal-head">
      <div class="meal-name">${mealEmoji[type]} ${mealLabel[type]}</div>
      <div class="tag">${meal.images.length}/3</div>
    </div>
    <div class="meal-track meal-track-simple">
      <input type="file" accept="image/*" style="display:none" id="file-${type}" onchange="uploadImage('${type}', this)">
      <button class="plus-box meal-add-btn" onclick="document.getElementById('file-${type}').click()">+</button>
      <div class="images images-inline">
        ${meal.images.map((src, i) => `<div class="thumb-wrap"><img class="thumb thumb-small" src="${src}" onclick="openMealEditor('${type}', ${i})"><button class="btn tiny" onclick="delImage('${type}',${i})">删</button></div>`).join('')}
      </div>
    </div>
    <div class="meal-note-preview">${noteText || '未填写餐食文字（可在图片预览里编辑，最多10字）'}</div>
  </div>`;
}

window.uploadImage = (type, input) => {
  const file = input.files[0];
  if (!file) return;
  const d = ensureDay(state.date);
  if (d.meals[type].images.length >= 3) {
    alert('每餐最多3张');
    return;
  }
  const fr = new FileReader();
  fr.onload = () => {
    d.meals[type].images.push(fr.result);
    const newIdx = d.meals[type].images.length - 1;
    saveDB();
    render();
    openMealEditor(type, newIdx);
  };
  fr.readAsDataURL(file);
  input.value = '';
};

window.delImage = (type, idx) => {
  const d = ensureDay(state.date);
  d.meals[type].images.splice(idx, 1);
  saveDB();
  render();
};

window.openMealEditor = (type, idx = 0) => {
  const d = ensureDay(state.date);
  const meal = d.meals[type];
  if (!meal.images.length) return;
  const safeIdx = Math.max(0, Math.min(idx, meal.images.length - 1));
  const src = meal.images[safeIdx];
  const currentNote = meal.note || '';
  const old = document.getElementById('mealEditorMask');
  if (old) old.remove();
  const mask = document.createElement('div');
  mask.id = 'mealEditorMask';
  mask.className = 'meal-modal-mask';
  mask.innerHTML = `<div class="meal-modal">
      <div class="meal-modal-head">
        <b>${mealEmoji[type]} ${mealLabel[type]} · 图片预览</b>
        <button class="btn tiny" onclick="closeMealEditor()">关闭</button>
      </div>
      <img class="meal-modal-img" src="${src}" alt="meal-preview">
      <div class="meal-modal-tip">文字备注（最多10字）</div>
      <input id="mealEditorInput" class="meal-modal-input" maxlength="10" value="${currentNote.replace(/"/g, '&quot;')}" placeholder="例如：鸡胸+蔬菜">
      <div class="meal-modal-footer">
        <span class="hint"><span id="mealEditorCount">${Math.min(10, currentNote.length)}</span>/10</span>
        <button class="btn primary tiny" onclick="saveMealNote('${type}')">保存文字</button>
      </div>
    </div>`;
  mask.addEventListener('click', (e) => {
    if (e.target === mask) closeMealEditor();
  });
  document.body.appendChild(mask);
  const input = document.getElementById('mealEditorInput');
  const cnt = document.getElementById('mealEditorCount');
  if (input && cnt) {
    input.addEventListener('input', () => {
      input.value = input.value.slice(0, 10);
      cnt.textContent = String(input.value.length);
    });
    input.focus();
  }
};

window.closeMealEditor = () => {
  const mask = document.getElementById('mealEditorMask');
  if (mask) mask.remove();
};

window.saveMealNote = (type) => {
  const input = document.getElementById('mealEditorInput');
  if (!input) return;
  const d = ensureDay(state.date);
  d.meals[type].note = String(input.value || '').slice(0, 10);
  saveDB();
  closeMealEditor();
  render();
};

window.setGoal = (k, v) => {
  const d = ensureDay(state.date);
  d.goals[k] = v;
  saveDB();
  render();
};

window.toggleGoal = (k) => {
  const d = ensureDay(state.date);
  d.goals[k] = !d.goals[k];
  if (d.goals[k]) showGoalCheer();
  saveDB();
  render();
};

function showGoalCheer() {
  const msg = goalCheers[Math.floor(Math.random() * goalCheers.length)];
  const old = document.getElementById('goalCheerToast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'goalCheerToast';
  el.className = 'goal-cheer-toast';
  el.textContent = `✨ ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, 1300);
}

window.saveDaily = () => {
  saveDB();
  render();
};

window.addWeight = () => {
  const v = Number(document.getElementById('weightInput').value);
  if (!v) return;
  const d = ensureDay(state.date);
  d.weights.push({ weight: v, at: new Date().toISOString() });
  saveDB();
  render();
};

function renderToday() {
  const d = ensureDay(state.date);
  const de = delta(state.date);
  const doneCount = [d.goals.diet, d.goals.exercise, d.goals.sleep].filter(Boolean).length;
  const lastW = d.weights.length ? `${d.weights[d.weights.length - 1].weight} kg` : '--';
  const reminder = de == null ? copies[Math.floor(Math.random() * copies.length)] : '保持这个节奏，今天也很棒';
  const petMood = doneCount === 3 ? { img: pet.satisfied, text: '三项全达标，今天超棒。' }
    : doneCount >= 1 ? { img: pet.happy, text: '已经完成一部分，继续冲刺。' }
    : { img: pet.curious, text: '还没开始打卡，先完成第一项吧。' };
  const actionSet = doneCount === 3
    ? [
      { img: pet.stretch, label: '舒展庆祝' },
      { img: pet.sleep, label: '睡眠修复' },
      { img: pet.think, label: '计划明天' },
      { img: pet.peek, label: '等待记录' }
    ]
    : doneCount >= 1
      ? [
        { img: pet.walk, label: '继续行动' },
        { img: pet.follow, label: '陪你坚持' },
        { img: pet.stare, label: '专注当下' },
        { img: pet.peek, label: '检查进度' }
      ]
      : [
        { img: pet.curious, label: '提醒开始' },
        { img: pet.peek, label: '看你打卡' },
        { img: pet.follow, label: '陪你启动' },
        { img: pet.think, label: '先定目标' }
      ];

  app.innerHTML = `<div class="phone-shell page-shell">${nav()}
  <div class="hero hero-banner card">
    <div class="hero-left-line"></div>
    <div class="hero-main">
      <h1 class="h1">今日记录</h1>
      <div class="muted">${state.date} · Day ${dayIndex(state.date)}</div>
      <div class="hint hero-hint">一起加油呀！ ${reminder}</div>
    </div>
    <img class="pet-avatar" src="${pet.happy}" alt="pet-happy">
  </div>
  <div class="today-overview card">
    <div class="today-actions-col">
      <div class="overview-title">行为打卡</div>
      <div class="goal-grid">
      ${goalToggle('控制饮食', 'diet', d.goals.diet)}
      ${goalToggle('规律锻炼', 'exercise', d.goals.exercise)}
      ${goalToggle('规律作息', 'sleep', d.goals.sleep)}
      </div>
    </div>
    <div class="today-weight" onclick="openWeightEditor()">
      <div class="overview-title">体重</div>
      <div class="weight-inline">
        <div class="weight-inline-box">${lastW === '--' ? 'xx' : lastW.replace(' kg','')}</div>
        <div class="weight-inline-unit">kg</div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="module-title">三餐记录</div>
    <div>${meals.map((m) => mealCard(m, d.meals[m])).join('')}</div>
  </div>
  <div class="dual-actions">
    <button class="btn primary big" onclick="saveDaily()">保存今日记录</button>
    <button class="btn secondary big" onclick="generateSummary();go('summary')">生成今日汇总图</button>
  </div>
  </div>`;
}

function renderSummary() {
  const d = ensureDay(state.date);
  const de = delta(state.date);
  const deltaTxt = de == null ? '--' : `${de > 0 ? '+' : ''}${de}kg`;
  const weightRows = (d.weights || []).slice(-4);
  app.innerHTML = `<div class="phone-shell page-shell">${nav()}
  <div class="hero">
    <div>
      <h1 class="h1">汇总预览</h1>
      <div class="muted">${state.date} · Day ${dayIndex(state.date)} · 较昨日 ${deltaTxt}</div>
    </div>
    <img class="pet-avatar" src="${pet.satisfied}" alt="pet-summary">
  </div>
  <div class="card canvas-wrap">
    ${d.summary ? `<img src="${d.summary}">` : `<div class="muted">先到“今日记录”生成汇总图</div>`}
  </div>
  <div class="card">
    <div class="section-title">今日行为打卡</div>
    ${goalRow('控制饮食', 'diet', d.goals.diet)}
    ${goalRow('规律锻炼', 'exercise', d.goals.exercise)}
    ${goalRow('规律作息', 'sleep', d.goals.sleep)}
  </div>
  <div class="card">
    <div class="section-title">体重记录（最近）</div>
    <canvas id="weightChart" width="960" height="260" style="width:100%;height:140px;margin-bottom:8px"></canvas>
    ${weightRows.length ? weightRows.map((w) => `<div class="weight-item"><span>${new Date(w.at).toLocaleTimeString()}</span><b>${w.weight} kg</b></div>`).join('') : '<div class="muted">暂无体重记录</div>'}
  </div>
  <div class="dual-actions">
    <button class="btn secondary big" onclick="go('today')">返回编辑</button>
    <button class="btn primary big" onclick="saveToAlbum()">保存到相册</button>
  </div>
  </div>`;
  renderWeightChart(d.weights || []);
}

function goalRow(name, key, val) {
  return `<div class="goal-row"><span>${name}</span><div class="goal-actions"><button class="pill ${val ? 'active' : ''}" onclick="setGoal('${key}', true)">是</button><button class="pill ${val ? '' : 'active'}" onclick="setGoal('${key}', false)">否</button></div></div>`;
}

function goalToggle(name, key, val) {
  return `<button class="goal-toggle ${val ? 'on' : 'off'}" onclick="toggleGoal('${key}')">${name}</button>`;
}

window.openWeightEditor = () => {
  const d = ensureDay(state.date);
  const old = document.getElementById('weightEditorMask');
  if (old) old.remove();
  const rows = (d.weights || []).map((w, i) => `<div class="weight-item"><span>${new Date(w.at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><b>${w.weight} kg</b><button class="btn tiny" onclick="delWeight(${i})">删</button></div>`).join('');
  const mask = document.createElement('div');
  mask.id = 'weightEditorMask';
  mask.className = 'meal-modal-mask';
  mask.innerHTML = `<div class="meal-modal">
    <div class="meal-modal-head">
      <b>今日体重更新</b>
      <button class="btn tiny" onclick="closeWeightEditor()">关闭</button>
    </div>
    <div class="row"><input id="weightInputModal" type="number" step="0.1" placeholder="例如 59.8"><button class="btn primary tiny" onclick="addWeightFromModal()">添加</button></div>
    <div style="margin-top:10px">${rows || '<div class="muted">暂无体重记录</div>'}</div>
  </div>`;
  mask.addEventListener('click', (e) => { if (e.target === mask) closeWeightEditor(); });
  document.body.appendChild(mask);
};

window.closeWeightEditor = () => {
  const mask = document.getElementById('weightEditorMask');
  if (mask) mask.remove();
};

window.addWeightFromModal = () => {
  const el = document.getElementById('weightInputModal');
  if (!el) return;
  const v = Number(el.value);
  if (!v) return;
  const d = ensureDay(state.date);
  d.weights.push({ weight: v, at: new Date().toISOString() });
  saveDB();
  openWeightEditor();
  render();
};

window.delWeight = (idx) => {
  const d = ensureDay(state.date);
  d.weights.splice(idx, 1);
  saveDB();
  openWeightEditor();
  render();
};

function drawRoundedImage(ctx, img, x, y, w, h, r = 18) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = text.split('');
  let line = '';
  let lines = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = chars[i];
      lines++;
      if (lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineHeight);
}

window.generateSummary = async () => {
  const d = ensureDay(state.date);
  const de = delta(state.date);
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 2100;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f7f1e7';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#2c1f17';
  ctx.font = 'bold 56px sans-serif';
  const dt = de == null ? '--' : `${de > 0 ? '+' : ''}${de}kg`;
  ctx.fillText(`Day ${dayIndex(state.date)} | ${state.date} | 较昨日 ${dt}`, 56, 94);
  if (de == null) {
    ctx.fillStyle = '#7a6557';
    ctx.font = '32px sans-serif';
    ctx.fillText(copies[Math.floor(Math.random() * copies.length)], 56, 146);
  }

  let y = 190;
  for (const type of meals) {
    ctx.fillStyle = '#fffaf3';
    ctx.fillRect(36, y, 1008, 600);
    ctx.fillStyle = '#563b29';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(`${mealEmoji[type]} ${mealLabel[type]}`, 68, y + 70);

    const meal = d.meals[type];
    const slots = [[380, y + 42, 290, 230], [690, y + 42, 290, 230], [535, y + 292, 290, 230]];
    for (let i = 0; i < Math.min(3, meal.images.length); i++) {
      try {
        const img = await loadImg(meal.images[i]);
        const [sx, sy, sw, sh] = slots[i];
        drawRoundedImage(ctx, img, sx, sy, sw, sh, 20);
      } catch {}
    }

    ctx.fillStyle = '#6b5142';
    ctx.font = '34px sans-serif';
    wrapText(ctx, meal.note || '未填写', 78, y + 154, 260, 44, 5);
    y += 640;
  }

  d.summary = c.toDataURL('image/png');
  saveDB();
  render();
};

function renderHistory() {
  const month = state.historyMonth;
  const rows = Object.values(state.data.days)
    .filter((d) => d.date.slice(0,7) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  app.innerHTML = `<div class="phone-shell page-shell">${nav()}<div class="card hero"><div><h1 class="h1">历史记录</h1><div class="muted">${month.replace('-', '年')}月</div></div><img class="pet-avatar" src="${pet.curious}" alt="pet-curious"></div>
  <div class="card">
    <div class="section-title">
      <button class="btn tiny" onclick="state.historyMonth=shiftMonth(state.historyMonth,-1);renderHistory()">‹ 上月</button>
      <span>${month.replace('-', '年')}月</span>
      <button class="btn tiny" onclick="state.historyMonth=shiftMonth(state.historyMonth,1);renderHistory()">下月 ›</button>
    </div>
  </div>
  <div class="card">
    <div class="section-title">本地备份</div>
    <div class="dual-actions">
      <button class="btn secondary" onclick="backupJson()">导出JSON备份</button>
      <button class="btn secondary" onclick="triggerRestore()">恢复JSON备份</button>
    </div>
    <input id="restoreFile" type="file" accept=".json,application/json" style="display:none" onchange="restoreJson(event)" />
    <div class="hint" style="margin-top:8px">建议每周备份一次；恢复会覆盖当前本地数据。</div>
  </div>
  <div class="card">
    <div class="scroll-box">
    ${rows.length ? rows.map((r) => {
      const imgCount = r.meals.breakfast.images.length + r.meals.lunch.images.length + r.meals.dinner.images.length;
      const done = [r.goals.diet, r.goals.exercise, r.goals.sleep].filter(Boolean).length;
      const w = r.weights.length ? `${r.weights[r.weights.length - 1].weight} kg` : '--';
      return `<div class="list-item"><div><b>${r.date.slice(8)} <span class="muted">${cnWeekday(r.date)}</span></b><div class="muted">🍽 ${imgCount?imgCount+'张':'无图'} · ✅ ${done}/3 · ⚖ ${w}</div></div><button class="btn tiny" onclick="go('today','${r.date}')">查看</button></div>`;
    }).join('') : '<div class="muted">暂无数据</div>'}
    </div>
    <div class="hint" style="margin-top:8px">图例：🍽 三餐图片 | ✅ 打卡达成数 | ⚖ 最终体重</div>
  </div></div>`;
}

window.downloadSummary = () => {
  const d = ensureDay(state.date);
  if (!d.summary) return alert('请先生成汇总图');
  const a = document.createElement('a');
  a.href = d.summary;
  a.download = `summary_${state.date}.png`;
  a.click();
};

window.saveToAlbum = async () => {
  const d = ensureDay(state.date);
  if (!d.summary) return alert('请先生成汇总图');
  try {
    const res = await fetch(d.summary);
    const blob = await res.blob();
    const file = new File([blob], `summary_${state.date}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '今日汇总图' });
      return;
    }
  } catch {}
  downloadSummary();
};

function renderWeightChart(weights){
  const canvas = document.getElementById('weightChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const rows = (weights || []).slice(-6);
  if (!rows.length) return;
  const vals = rows.map((w) => Number(w.weight));
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = 26;
  const w = canvas.width, h = canvas.height;
  const toX = (i) => pad + (i * (w - pad*2) / Math.max(1, rows.length-1));
  const toY = (v) => {
    if (max === min) return h/2;
    return h - pad - ((v - min) * (h - pad*2) / (max - min));
  };
  ctx.strokeStyle = '#ecd9c4';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
  ctx.strokeStyle = '#d39a5f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  rows.forEach((r,i)=>{ const x=toX(i), y=toY(Number(r.weight)); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  rows.forEach((r,i)=>{
    const x=toX(i), y=toY(Number(r.weight));
    ctx.fillStyle='#d39a5f'; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6f5a4a'; ctx.font='20px sans-serif'; ctx.fillText(String(r.weight), x-14, y-10);
    const t = new Date(r.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    ctx.fillStyle='#9a8575'; ctx.font='16px sans-serif'; ctx.fillText(t, x-20, h-6);
  });
}

window.backupJson = () => {
  try {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diet_backup_${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert('备份已导出');
  } catch {
    alert('导出失败，请重试');
  }
};

window.triggerRestore = () => {
  const el = document.getElementById('restoreFile');
  if (el) el.click();
};

window.restoreJson = (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      if (!parsed || !parsed.settings || !parsed.days) throw new Error('bad-format');
      if (!confirm('确认恢复该备份？这会覆盖当前本地数据。')) return;
      state.data = parsed;
      window.dietDataManager.data = parsed;
      window.dietDataManager.save();
      render();
      alert('恢复成功');
    } catch {
      alert('恢复失败：文件格式不正确');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
};

window.saveStartDate = () => {
  const v = document.getElementById('startDate').value;
  if (!v) return;
  state.data.settings.startDate = v;
  saveDB();
  go('today');
};

function renderSettings() {
  app.innerHTML = `${nav()}<div class="card hero"><div><h1 class="h1">系统设置</h1><div class="muted">管理开始记录日与导出能力</div></div><img class="pet-avatar small" src="${pet.satisfied}" alt="pet-satisfied"></div>
  <div class="card">
    <div class="section-title">情绪素材</div>
    <div class="pet-strip">
      <div class="pet-chip"><img src="${pet.happy}" alt="happy"><span>开心</span></div>
      <div class="pet-chip"><img src="${pet.wink}" alt="wink"><span>眨眼</span></div>
      <div class="pet-chip"><img src="${pet.curious}" alt="curious"><span>好奇</span></div>
      <div class="pet-chip"><img src="${pet.satisfied}" alt="satisfied"><span>满足</span></div>
    </div>
  </div>
  <div class="card">
    <div class="section-title">开始记录日</div>
    <input id="startDate" type="date" value="${state.data.settings.startDate}">
    <div style="margin-top:10px"><button class="btn primary" onclick="saveStartDate()">保存</button></div>
  </div>`;
}

function render() {
  if (state.page === 'summary') return renderSummary();
  if (state.page === 'history') return renderHistory();
  return renderToday();
}

function mountDesktopPet() {
  let host = document.getElementById('desktopPet');
  if (host) return;

  host = document.createElement('div');
  host.id = 'desktopPet';
  host.className = 'desktop-pet';
  host.innerHTML = `
    <div class="pet-bubble" id="petBubble">二狗陪你打卡</div>
    <img class="desktop-pet-img" id="desktopPetImg" src="${pet.mainSit}" alt="二狗">
  `;
  document.body.appendChild(host);

  const bubble = document.getElementById('petBubble');
  const img = document.getElementById('desktopPetImg');
  const states = [pet.mainSit, pet.follow, pet.walk, pet.peek, pet.stare, pet.think, pet.lie, pet.sleep, pet.stretch, pet.happy, pet.wink, pet.curious, pet.satisfied];
  let idx = 0;
  let tx = window.innerWidth - 140;
  let cx = tx;
  let ty = window.innerHeight - 160;
  let cy = ty;

  function say(msg) {
    bubble.textContent = msg;
    bubble.classList.add('show');
    clearTimeout(say.timer);
    say.timer = setTimeout(() => bubble.classList.remove('show'), 1900);
  }

  function setPose(next, msg) {
    img.src = next;
    if (msg) say(msg);
  }

  host.addEventListener('click', () => {
    idx = (idx + 1) % states.length;
    setPose(states[idx], '二狗切换动作中');
  });

  document.addEventListener('mousemove', (e) => {
    const zoneY = window.innerHeight - 230;
    tx = Math.max(20, Math.min(window.innerWidth - 120, e.clientX - 44));
    ty = e.clientY > zoneY ? window.innerHeight - 170 : window.innerHeight - 150;
    host.classList.toggle('looking-left', e.clientX < cx);
  });

  setInterval(() => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    host.style.transform = `translate(${cx}px, ${cy}px)`;
  }, 16);

  setInterval(() => {
    const r = Math.random();
    if (r < 0.22) setPose(pet.sleep, '二狗打个盹');
    else if (r < 0.5) setPose(pet.curious, '你在做什么呀');
    else if (r < 0.72) setPose(pet.follow, '继续跟着你');
    else setPose(pet.mainSit, petTalks[Math.floor(Math.random() * petTalks.length)]);
  }, 6500);

  window.addEventListener('resize', () => {
    tx = Math.min(tx, window.innerWidth - 120);
    ty = window.innerHeight - 150;
  });

  host.style.transform = `translate(${cx}px, ${cy}px)`;
}

try {
  if (!app) throw new Error('页面缺少 #app 容器');
  render();
  mountDesktopPet();
  const tag = document.createElement('div');
  tag.className = 'build-tag';
  tag.innerHTML = 'build 2026-05-26.6 · 本地 · <a href="./admin.html" style="color:#9a6e47;text-decoration:none;font-weight:700">后台</a>';
  document.body.appendChild(tag);
} catch (err) {
  document.body.innerHTML = `<pre style="padding:16px;white-space:pre-wrap;font-family:monospace">页面初始化失败:\n${err?.message || err}</pre>`;
}




