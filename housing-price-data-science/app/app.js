// ---------- Tabs ----------
const tabBtns = document.querySelectorAll('nav.tabs button');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('section.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

// ---------- Theme colors (read from CSS vars) ----------
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

// ---------- Helpers ----------
function fmtUSD(n){ return '$' + Math.round(n).toLocaleString('en-US'); }

function priceColor(v){
  // gradient from teal (low) -> gold (high) over ~$15k-$500k
  const t = Math.max(0, Math.min(1, (v - 15000) / (480000 - 15000)));
  const teal = [47,110,104], gold = [166,120,44];
  const r = Math.round(teal[0] + (gold[0]-teal[0])*t);
  const g = Math.round(teal[1] + (gold[1]-teal[1])*t);
  const b = Math.round(teal[2] + (gold[2]-teal[2])*t);
  return `rgb(${r},${g},${b})`;
}

// ---------- Hero geographic map ----------
function drawHeroMap(){
  const c = document.getElementById('heroMap');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = cssVar('--paper-2') || '#E1DDCF';
  ctx.fillRect(0,0,W,H);

  const lons = SAMPLE_POINTS.map(p => p.longitude);
  const lats = SAMPLE_POINTS.map(p => p.latitude);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const pad = 30;

  SAMPLE_POINTS.forEach(p => {
    const x = pad + (p.longitude - lonMin) / (lonMax - lonMin) * (W - 2*pad);
    const y = H - pad - (p.latitude - latMin) / (latMax - latMin) * (H - 2*pad);
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI*2);
    ctx.fillStyle = priceColor(p.median_house_value);
    ctx.globalAlpha = 0.75;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---------- Explore: income vs price scatter ----------
function drawScatterIncome(){
  const c = document.getElementById('scatterIncome');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, pad = 40;
  ctx.clearRect(0,0,W,H);

  const xs = SAMPLE_POINTS.map(p => p.median_income);
  const ys = SAMPLE_POINTS.map(p => p.median_house_value);
  const xMax = Math.max(...xs), yMax = Math.max(...ys);

  ctx.strokeStyle = cssVar('--line') || '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-10, H-pad); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(pad, 10); ctx.stroke();

  SAMPLE_POINTS.forEach(p => {
    const x = pad + (p.median_income / xMax) * (W - pad - 20);
    const y = H - pad - (p.median_house_value / yMax) * (H - pad - 20);
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI*2);
    ctx.fillStyle = cssVar('--teal-deep') || '#1F4B47';
    ctx.globalAlpha = 0.35;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = cssVar('--ink-soft') || '#555';
  ctx.font = '11px IBM Plex Mono';
  ctx.fillText('income →', W-70, H-pad+22);
  ctx.save();
  ctx.translate(14, pad);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('price →', 0, 0);
  ctx.restore();
}

// ---------- Explore: box-ish plot of price by ocean proximity ----------
function drawBoxOcean(){
  const c = document.getElementById('boxOcean');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, pad = 44;
  ctx.clearRect(0,0,W,H);

  const groups = {};
  SAMPLE_POINTS.forEach(p => {
    (groups[p.ocean_proximity] = groups[p.ocean_proximity] || []).push(p.median_house_value);
  });
  const order = Object.keys(groups).sort((a,b) => median(groups[a]) - median(groups[b]));
  const yMax = Math.max(...SAMPLE_POINTS.map(p => p.median_house_value));

  function median(arr){ const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; }
  function quartile(arr, q){ const s=[...arr].sort((a,b)=>a-b); const pos=(s.length-1)*q; const base=Math.floor(pos); const rest=pos-base; return s[base+1]!==undefined ? s[base]+rest*(s[base+1]-s[base]) : s[base]; }

  const bw = (W - pad - 20) / order.length;
  ctx.strokeStyle = cssVar('--line') || '#ccc';
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-10, H-pad); ctx.stroke();

  order.forEach((g, i) => {
    const vals = groups[g];
    const q1 = quartile(vals, 0.25), q3 = quartile(vals, 0.75), med = median(vals);
    const cx = pad + bw*i + bw/2;
    const yOf = v => H - pad - (v/yMax) * (H - pad - 20);

    ctx.strokeStyle = cssVar('--ink-soft') || '#888';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, yOf(q1)); ctx.lineTo(cx, yOf(q3)); ctx.stroke();

    ctx.fillStyle = cssVar('--teal') || '#2F6E68';
    ctx.globalAlpha = 0.75;
    ctx.fillRect(cx-14, yOf(q3), 28, Math.max(2, yOf(q1)-yOf(q3)));
    ctx.globalAlpha = 1;

    ctx.strokeStyle = cssVar('--gold') || '#A6782C';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx-14, yOf(med)); ctx.lineTo(cx+14, yOf(med)); ctx.stroke();

    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.font = '10px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText(g.replace(' OCEAN','').replace('<1H','<1H'), cx, H-pad+16);
  });
  ctx.textAlign = 'left';
}

// ---------- Explore: price histogram ----------
function drawHistPrice(){
  const c = document.getElementById('histPrice');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, pad = 34;
  ctx.clearRect(0,0,W,H);

  const vals = SAMPLE_POINTS.map(p => p.median_house_value);
  const nBins = 24;
  const max = Math.max(...vals);
  const bins = new Array(nBins).fill(0);
  vals.forEach(v => { const idx = Math.min(nBins-1, Math.floor(v/max*nBins)); bins[idx]++; });
  const binMax = Math.max(...bins);

  const bw = (W - pad - 10) / nBins;
  bins.forEach((count, i) => {
    const h = (count/binMax) * (H - pad - 15);
    ctx.fillStyle = cssVar('--teal') || '#2F6E68';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(pad + i*bw, H - pad - h, bw-2, h);
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = cssVar('--line') || '#ccc';
  ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-5, H-pad); ctx.stroke();
}

// ---------- Explore: correlation bars ----------
function drawCorrBars(){
  const c = document.getElementById('corrBars');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, pad = 10;
  ctx.clearRect(0,0,W,H);

  const data = [
    ['median_income', 0.6426],
    ['rooms_per_household', 0.1799],
    ['total_rooms', 0.1431],
    ['households', 0.0949],
    ['housing_median_age', 0.0679],
    ['bedrooms_per_room', -0.2234],
    ['population_per_household', -0.2492],
  ];
  const rowH = (H - 20) / data.length;
  const maxAbs = 0.65;
  const midX = W*0.42;

  data.forEach(([name, val], i) => {
    const y = 12 + i*rowH;
    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'right';
    ctx.fillText(name, midX - 8, y + rowH*0.55);
    ctx.textAlign = 'left';

    const barW = Math.abs(val)/maxAbs * (W - midX - 40);
    ctx.fillStyle = val >= 0 ? (cssVar('--teal') || '#2F6E68') : (cssVar('--rust') || '#9C4B3A');
    const x0 = val >= 0 ? midX : midX - barW;
    ctx.fillRect(x0, y + rowH*0.18, barW, rowH*0.5);

    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.font = '10px IBM Plex Mono';
    ctx.fillText(val.toFixed(2), midX + (val>=0?barW+6:6), y + rowH*0.55);
  });
}

// ---------- Model tab: results table ----------
function fillResultsTable(){
  const tbody = document.querySelector('#resultsTable tbody');
  Object.entries(MODEL_RESULTS).forEach(([name, m]) => {
    const tr = document.createElement('tr');
    if (name === BEST_MODEL) tr.className = 'best';
    tr.innerHTML = `<td>${name}${name===BEST_MODEL?' — best':''}</td>
      <td class="num">${fmtUSD(m.MAE)}</td>
      <td class="num">${fmtUSD(m.RMSE)}</td>
      <td class="num">${m.R2.toFixed(3)}</td>`;
    tbody.appendChild(tr);
  });
}

function drawRmseBars(){
  const c = document.getElementById('rmseBars');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, pad = 40;
  ctx.clearRect(0,0,W,H);
  const entries = Object.entries(MODEL_RESULTS);
  const max = Math.max(...entries.map(([,m]) => m.RMSE));
  const bw = (W - pad - 10) / entries.length;

  entries.forEach(([name, m], i) => {
    const h = (m.RMSE/max) * (H - pad - 20);
    const x = pad/2 + i*bw;
    ctx.fillStyle = name === BEST_MODEL ? (cssVar('--gold') || '#A6782C') : (cssVar('--teal') || '#2F6E68');
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, H - pad - h, bw - 14, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.font = '9.5px IBM Plex Sans';
    ctx.textAlign = 'center';
    wrapText(ctx, name, x + (bw-14)/2, H - pad + 14, bw, 10);
  });
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ');
  let line = '', ly = y;
  words.forEach(w => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, ly);
      line = w + ' '; ly += lineHeight;
    } else line = test;
  });
  ctx.fillText(line, x, ly);
}

function drawImportanceBars(){
  const c = document.getElementById('importanceBars');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  const data = FEATURE_IMPORTANCE.slice(0,6);
  const max = Math.max(...data.map(d => d.importance));
  const rowH = (H - 20) / data.length;
  const labelW = 150;

  data.forEach((d, i) => {
    const y = 10 + i*rowH;
    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'right';
    ctx.fillText(d.feature, labelW - 8, y + rowH*0.55);
    ctx.textAlign = 'left';
    const barW = (d.importance/max) * (W - labelW - 50);
    ctx.fillStyle = cssVar('--gold') || '#A6782C';
    ctx.fillRect(labelW, y + rowH*0.2, barW, rowH*0.5);
    ctx.fillStyle = cssVar('--ink-soft') || '#555';
    ctx.fillText((d.importance*100).toFixed(1)+'%', labelW + barW + 6, y + rowH*0.55);
  });
}

// ---------- Predict tab: live linear-regression calculator ----------
function standardize(name, value){
  const idx = LIN.numeric_features.indexOf(name);
  return (value - LIN.numeric_mean[idx]) / LIN.numeric_scale[idx];
}

function predict(){
  const income = +document.getElementById('income').value / 10000; // to tens of thousands, matches training units
  const rooms = +document.getElementById('rooms').value;
  const bedroomsRatio = +document.getElementById('bedrooms').value;
  const pop = +document.getElementById('pop').value;
  const age = +document.getElementById('age').value;
  const ocean = document.getElementById('ocean').value;

  // Hold non-exposed numeric features (lon/lat/total_rooms/total_bedrooms/households/population)
  // at their training-set means, since the calculator exposes derived/interpretable inputs only.
  const fixed = {
    longitude: LIN.numeric_mean[0],
    latitude: LIN.numeric_mean[1],
    total_rooms: LIN.numeric_mean[3],
    total_bedrooms: LIN.numeric_mean[4],
    population: LIN.numeric_mean[5],
    households: LIN.numeric_mean[6],
  };

  const values = {
    longitude: fixed.longitude, latitude: fixed.latitude,
    housing_median_age: age,
    total_rooms: fixed.total_rooms, total_bedrooms: fixed.total_bedrooms,
    population: fixed.population, households: fixed.households,
    median_income: income,
    rooms_per_household: rooms,
    bedrooms_per_room: bedroomsRatio,
    population_per_household: pop,
  };

  let z = LIN.intercept;
  const contrib = {};
  LIN.numeric_features.forEach((name, i) => {
    const zval = standardize(name, values[name]);
    const c = zval * LIN.coefficients[i];
    z += c;
    contrib[name] = c;
  });

  const catIdx = LIN.categorical_categories.indexOf(ocean);
  let oceanContrib = 0;
  LIN.categorical_categories.forEach((cat, j) => {
    const coefIdx = LIN.numeric_features.length + j;
    const active = (cat === ocean) ? 1 : 0;
    const c = active * LIN.coefficients[coefIdx];
    z += c;
    if (active) oceanContrib = c;
  });

  return { estimate: Math.max(20000, z), contrib, oceanContrib };
}

function updateBar(id, valId, contribValue, maxAbs){
  const pct = Math.min(100, Math.abs(contribValue) / maxAbs * 100);
  document.getElementById('bar-' + id).style.width = pct + '%';
  document.getElementById('bv-' + id).textContent = (contribValue >= 0 ? '+' : '−') + fmtUSD(Math.abs(contribValue)).replace('$','');
}

function refreshPredict(){
  document.getElementById('incomeVal').textContent = fmtUSD(+document.getElementById('income').value);
  document.getElementById('roomsVal').textContent = (+document.getElementById('rooms').value).toFixed(1);
  document.getElementById('bedroomsVal').textContent = (+document.getElementById('bedrooms').value).toFixed(2);
  document.getElementById('popVal').textContent = (+document.getElementById('pop').value).toFixed(1);
  document.getElementById('ageVal').textContent = document.getElementById('age').value + ' yrs';

  const { estimate, contrib, oceanContrib } = predict();
  document.getElementById('predAmount').textContent = fmtUSD(estimate);
  document.getElementById('predRange').textContent =
    `Typical error for this model: ± ${fmtUSD(MODEL_RESULTS['Linear Regression'].MAE)}`;

  const roomsContrib = (contrib['rooms_per_household']||0) + (contrib['bedrooms_per_room']||0);
  const maxAbs = Math.max(
    Math.abs(contrib['median_income']||0), Math.abs(oceanContrib),
    Math.abs(contrib['population_per_household']||0), Math.abs(roomsContrib), 1
  );
  updateBar('income','income', contrib['median_income']||0, maxAbs);
  updateBar('ocean','ocean', oceanContrib, maxAbs);
  updateBar('pop','pop', contrib['population_per_household']||0, maxAbs);
  updateBar('rooms','rooms', roomsContrib, maxAbs);
}

['income','rooms','bedrooms','pop','age'].forEach(id => {
  document.getElementById(id).addEventListener('input', refreshPredict);
});
document.getElementById('ocean').addEventListener('change', refreshPredict);

// ---------- Init ----------
window.addEventListener('load', () => {
  drawHeroMap();
  drawScatterIncome();
  drawBoxOcean();
  drawHistPrice();
  drawCorrBars();
  fillResultsTable();
  drawRmseBars();
  drawImportanceBars();
  refreshPredict();
});
