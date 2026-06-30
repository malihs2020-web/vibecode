'use strict';

// ── Storage helpers ──────────────────────────────────────────────────────────
const load = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ── State ────────────────────────────────────────────────────────────────────
let foods = load('foods', defaultFoods());
let diary = load('diary', {});      // { 'YYYY-MM-DD': { breakfast:[], lunch:[], dinner:[], snack:[] } }
let goalCal = load('goalCal', null);
let diaryDate = todayKey();
let currentMeal = null;
let selectedFood = null;
let editFoodId = null;

// ── Default food database ────────────────────────────────────────────────────
function defaultFoods() {
  return [
    { id: uid(), name: 'Куриная грудь (варёная)', cal: 165, protein: 31, fat: 3.6, carbs: 0 },
    { id: uid(), name: 'Рис (варёный)', cal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
    { id: uid(), name: 'Гречка (варёная)', cal: 110, protein: 4, fat: 1, carbs: 21 },
    { id: uid(), name: 'Овсянка (варёная)', cal: 88, protein: 3, fat: 1.5, carbs: 15 },
    { id: uid(), name: 'Яйцо куриное (1 шт ≈ 60г)', cal: 155, protein: 13, fat: 11, carbs: 1.1 },
    { id: uid(), name: 'Молоко 2.5%', cal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
    { id: uid(), name: 'Творог 5%', cal: 121, protein: 17, fat: 5, carbs: 1.8 },
    { id: uid(), name: 'Хлеб ржаной', cal: 259, protein: 6.6, fat: 1.2, carbs: 48 },
    { id: uid(), name: 'Картофель (варёный)', cal: 82, protein: 2, fat: 0.1, carbs: 17 },
    { id: uid(), name: 'Говядина (тушёная)', cal: 218, protein: 25, fat: 13, carbs: 0 },
    { id: uid(), name: 'Лосось (запечённый)', cal: 206, protein: 20, fat: 13, carbs: 0 },
    { id: uid(), name: 'Яблоко', cal: 52, protein: 0.3, fat: 0.2, carbs: 14 },
    { id: uid(), name: 'Банан', cal: 89, protein: 1.1, fat: 0.3, carbs: 23 },
    { id: uid(), name: 'Апельсин', cal: 47, protein: 0.9, fat: 0.1, carbs: 12 },
    { id: uid(), name: 'Огурец', cal: 15, protein: 0.7, fat: 0.1, carbs: 2.5 },
    { id: uid(), name: 'Помидор', cal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
    { id: uid(), name: 'Масло подсолнечное', cal: 884, protein: 0, fat: 100, carbs: 0 },
    { id: uid(), name: 'Греческий йогурт', cal: 59, protein: 10, fat: 0.4, carbs: 3.6 },
    { id: uid(), name: 'Миндаль', cal: 579, protein: 21, fat: 50, carbs: 22 },
    { id: uid(), name: 'Макароны (варёные)', cal: 158, protein: 5.8, fat: 0.9, carbs: 31 },
  ];
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

function diaryDay(date) {
  if (!diary[date]) diary[date] = { breakfast: [], lunch: [], dinner: [], snack: [], water: 0 };
  return diary[date];
}

const WATER_GOAL = 8;       // стаканов в день
const GLASS_ML = 250;       // мл в стакане

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'stats') renderStats();
  });
});

// ── Calculator ───────────────────────────────────────────────────────────────
document.getElementById('calc-btn').addEventListener('click', calculate);

function calculate() {
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = +document.getElementById('age').value;
  const weight = +document.getElementById('weight').value;
  const height = +document.getElementById('height').value;
  const activity = +document.getElementById('activity').value;
  const goal = +document.getElementById('goal').value;

  if (!age || !weight || !height) return;

  // Mifflin-St Jeor
  let bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * activity + goal);
  bmr = Math.round(bmr);

  const protein = Math.round(weight * 2.0);
  const fat = Math.round((tdee * 0.25) / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);

  const bmi = weight / ((height / 100) ** 2);
  const bmiLabel = bmi < 18.5 ? 'Недовес' : bmi < 25 ? 'Норма' : bmi < 30 ? 'Избыток' : 'Ожирение';

  document.getElementById('res-bmr').textContent = bmr;
  document.getElementById('res-tdee').textContent = tdee;
  document.getElementById('res-protein').textContent = protein;
  document.getElementById('res-fat').textContent = fat;
  document.getElementById('res-carbs').textContent = Math.max(0, carbs);
  document.getElementById('res-bmi').textContent = bmi.toFixed(1);
  document.getElementById('res-bmi-label').textContent = bmiLabel;
  document.getElementById('results').style.display = 'grid';

  goalCal = tdee;
  save('goalCal', goalCal);
  renderDiary();
}

// ── Diary ────────────────────────────────────────────────────────────────────
const diaryDateEl = document.getElementById('diary-date');

function renderDiaryDate() {
  const d = new Date(diaryDate + 'T00:00:00');
  const today = todayKey();
  const isToday = diaryDate === today;
  const opts = { day: 'numeric', month: 'long', weekday: 'short' };
  diaryDateEl.textContent = (isToday ? 'Сегодня, ' : '') + d.toLocaleDateString('ru-RU', opts);
}

function renderDiary() {
  renderDiaryDate();
  const day = diaryDay(diaryDate);
  let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;

  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(meal => {
    const container = document.getElementById(`meal-${meal}`);
    container.innerHTML = '';
    (day[meal] || []).forEach((entry, idx) => {
      totalCal += entry.cal;
      totalP += entry.protein;
      totalF += entry.fat;
      totalC += entry.carbs;
      const row = document.createElement('div');
      row.className = 'entry-row';
      row.innerHTML = `
        <div class="entry-name">${entry.name}</div>
        <div class="entry-meta">${entry.amount}г · Б${entry.protein.toFixed(1)} Ж${entry.fat.toFixed(1)} У${entry.carbs.toFixed(1)}</div>
        <div class="entry-cal">${Math.round(entry.cal)} ккал</div>
        <button class="entry-del" data-meal="${meal}" data-idx="${idx}">×</button>
      `;
      container.appendChild(row);
    });
  });

  document.getElementById('eaten-cal').textContent = Math.round(totalCal);
  document.getElementById('goal-cal').textContent = goalCal ?? '—';
  document.getElementById('d-protein').textContent = totalP.toFixed(1);
  document.getElementById('d-fat').textContent = totalF.toFixed(1);
  document.getElementById('d-carbs').textContent = totalC.toFixed(1);

  const pct = goalCal ? Math.min((totalCal / goalCal) * 100, 120) : 0;
  const fill = document.getElementById('progress-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('over', goalCal && totalCal > goalCal);

  renderWater();
}

// ── Water tracker ────────────────────────────────────────────────────────────
function renderWater() {
  const count = diaryDay(diaryDate).water || 0;
  document.getElementById('water-count').textContent = count;
  document.getElementById('water-goal').textContent = WATER_GOAL;
  document.getElementById('water-ml').textContent = count * GLASS_ML;

  const wrap = document.getElementById('water-glasses');
  const total = Math.max(WATER_GOAL, count);
  wrap.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const g = document.createElement('div');
    g.className = 'glass' + (i < count ? ' filled' : '');
    wrap.appendChild(g);
  }
}

function changeWater(delta) {
  const day = diaryDay(diaryDate);
  day.water = Math.max(0, (day.water || 0) + delta);
  save('diary', diary);
  renderWater();
}

document.getElementById('water-plus').addEventListener('click', () => changeWater(1));
document.getElementById('water-minus').addEventListener('click', () => changeWater(-1));

document.getElementById('prev-day').addEventListener('click', () => {
  const d = new Date(diaryDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  diaryDate = d.toISOString().slice(0, 10);
  renderDiary();
});
document.getElementById('next-day').addEventListener('click', () => {
  const d = new Date(diaryDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  diaryDate = d.toISOString().slice(0, 10);
  renderDiary();
});

document.querySelector('.meals').addEventListener('click', e => {
  if (e.target.classList.contains('add-entry-btn')) {
    currentMeal = e.target.dataset.meal;
    openAddEntry();
  }
  if (e.target.classList.contains('entry-del')) {
    const { meal, idx } = e.target.dataset;
    diaryDay(diaryDate)[meal].splice(+idx, 1);
    save('diary', diary);
    renderDiary();
  }
});

// ── Add entry modal ──────────────────────────────────────────────────────────
const addEntryModal = document.getElementById('add-entry-modal');
const entrySearchEl = document.getElementById('entry-search');
const entryResultsEl = document.getElementById('entry-search-results');
const entryAmountRow = document.getElementById('entry-amount-row');
const entryAmountEl = document.getElementById('entry-amount');
const entryPreviewEl = document.getElementById('entry-preview');

function openAddEntry() {
  selectedFood = null;
  entrySearchEl.value = '';
  entryResultsEl.innerHTML = '';
  entryAmountRow.style.display = 'none';
  addEntryModal.style.display = 'flex';
  entrySearchEl.focus();
  renderEntrySearch('');
}

entrySearchEl.addEventListener('input', () => renderEntrySearch(entrySearchEl.value));

function renderEntrySearch(q) {
  const results = foods.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
  entryResultsEl.innerHTML = results.length
    ? results.map(f => `
        <div class="search-result-item" data-id="${f.id}">
          <span>${f.name}</span>
          <span class="search-result-cal">${f.cal} ккал</span>
        </div>`).join('')
    : '<div style="padding:12px;color:var(--muted);font-size:.85rem">Ничего не найдено</div>';
}

entryResultsEl.addEventListener('click', e => {
  const item = e.target.closest('.search-result-item');
  if (!item) return;
  selectedFood = foods.find(f => f.id === item.dataset.id);
  entryAmountRow.style.display = 'block';
  entryAmountEl.value = 100;
  updateEntryPreview();
  entryAmountEl.focus();
});

entryAmountEl.addEventListener('input', updateEntryPreview);

function updateEntryPreview() {
  if (!selectedFood) return;
  const g = +entryAmountEl.value || 0;
  const k = g / 100;
  entryPreviewEl.textContent = `≈ ${Math.round(selectedFood.cal * k)} ккал · Б${(selectedFood.protein * k).toFixed(1)}г · Ж${(selectedFood.fat * k).toFixed(1)}г · У${(selectedFood.carbs * k).toFixed(1)}г`;
}

document.getElementById('entry-cancel').addEventListener('click', () => { addEntryModal.style.display = 'none'; });
document.getElementById('entry-confirm').addEventListener('click', () => {
  if (!selectedFood || !currentMeal) return;
  const g = +entryAmountEl.value;
  if (!g) return;
  const k = g / 100;
  diaryDay(diaryDate)[currentMeal].push({
    foodId: selectedFood.id,
    name: selectedFood.name,
    amount: g,
    cal: selectedFood.cal * k,
    protein: selectedFood.protein * k,
    fat: selectedFood.fat * k,
    carbs: selectedFood.carbs * k,
  });
  save('diary', diary);
  renderDiary();
  addEntryModal.style.display = 'none';
});

addEntryModal.addEventListener('click', e => { if (e.target === addEntryModal) addEntryModal.style.display = 'none'; });

// ── Foods tab ────────────────────────────────────────────────────────────────
const foodSearch = document.getElementById('food-search');
foodSearch.addEventListener('input', renderFoods);

function renderFoods() {
  const q = foodSearch.value.toLowerCase();
  const list = document.getElementById('foods-list');
  const filtered = foods.filter(f => f.name.toLowerCase().includes(q));
  if (!filtered.length) {
    list.innerHTML = '<div class="foods-empty">Продукты не найдены</div>';
    return;
  }
  list.innerHTML = filtered.map(f => `
    <div class="food-row" data-id="${f.id}">
      <div class="food-name">${f.name}</div>
      <div class="food-macros">Б${f.protein} · Ж${f.fat} · У${f.carbs}</div>
      <div class="food-cal">${f.cal} ккал</div>
      <div class="food-actions">
        <button class="food-edit" data-id="${f.id}">✎</button>
        <button class="food-del" data-id="${f.id}">✕</button>
      </div>
    </div>`).join('');
}

document.getElementById('foods-list').addEventListener('click', e => {
  const editBtn = e.target.closest('.food-edit');
  const delBtn = e.target.closest('.food-del');
  if (editBtn) openFoodModal(editBtn.dataset.id);
  if (delBtn) {
    foods = foods.filter(f => f.id !== delBtn.dataset.id);
    save('foods', foods);
    renderFoods();
  }
});

// ── Food modal ───────────────────────────────────────────────────────────────
const foodModal = document.getElementById('food-modal');

document.getElementById('add-food-btn').addEventListener('click', () => openFoodModal(null));

function openFoodModal(id) {
  editFoodId = id;
  const food = id ? foods.find(f => f.id === id) : null;
  document.getElementById('food-modal-title').textContent = food ? 'Редактировать продукт' : 'Новый продукт';
  document.getElementById('fm-name').value = food?.name ?? '';
  document.getElementById('fm-cal').value = food?.cal ?? '';
  document.getElementById('fm-protein').value = food?.protein ?? '';
  document.getElementById('fm-fat').value = food?.fat ?? '';
  document.getElementById('fm-carbs').value = food?.carbs ?? '';
  foodModal.style.display = 'flex';
  document.getElementById('fm-name').focus();
}

document.getElementById('food-cancel').addEventListener('click', () => { foodModal.style.display = 'none'; });
document.getElementById('food-save').addEventListener('click', () => {
  const name = document.getElementById('fm-name').value.trim();
  const cal = parseFloat(document.getElementById('fm-cal').value);
  const protein = parseFloat(document.getElementById('fm-protein').value) || 0;
  const fat = parseFloat(document.getElementById('fm-fat').value) || 0;
  const carbs = parseFloat(document.getElementById('fm-carbs').value) || 0;
  if (!name || isNaN(cal)) return;

  if (editFoodId) {
    const f = foods.find(f => f.id === editFoodId);
    Object.assign(f, { name, cal, protein, fat, carbs });
  } else {
    foods.push({ id: uid(), name, cal, protein, fat, carbs });
  }
  save('foods', foods);
  renderFoods();
  foodModal.style.display = 'none';
});

foodModal.addEventListener('click', e => { if (e.target === foodModal) foodModal.style.display = 'none'; });

// ── Stats (weekly chart) ─────────────────────────────────────────────────────
function lastNDays(n) {
  const days = [];
  const base = new Date(todayKey() + 'T00:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayCalories(key) {
  const day = diary[key];
  if (!day) return 0;
  return ['breakfast', 'lunch', 'dinner', 'snack']
    .reduce((sum, meal) => sum + (day[meal] || []).reduce((s, e) => s + e.cal, 0), 0);
}

function renderStats() {
  const days = lastNDays(7);
  const cals = days.map(dayCalories);
  const today = todayKey();
  // Шкала: максимум из съеденного и цели, +15% сверху чтобы столбцы не упирались в потолок
  const scale = Math.max(goalCal || 0, ...cals, 1) * 1.15;

  const plot = document.getElementById('week-chart');
  plot.innerHTML = days.map((key, i) => {
    const cal = cals[i];
    const h = (cal / scale) * 100;
    const cls = !cal ? 'empty' : (goalCal && cal > goalCal ? 'over' : '');
    return `<div class="bar-col">
      <div class="bar-val">${cal ? Math.round(cal) : ''}</div>
      <div class="bar ${cls}" style="height:${h}%"></div>
    </div>`;
  }).join('');

  if (goalCal) {
    const pct = Math.min((goalCal / scale) * 100, 100);
    plot.insertAdjacentHTML('beforeend',
      `<div class="goal-line" style="bottom:${pct}%"><span>цель ${goalCal}</span></div>`);
  }

  document.getElementById('week-labels').innerHTML = days.map(key => {
    const d = new Date(key + 'T00:00:00');
    const wd = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return `<span class="${key === today ? 'today' : ''}">${wd}<br>${d.getDate()}</span>`;
  }).join('');

  const logged = cals.filter(c => c > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
  document.getElementById('chart-summary').textContent =
    `Среднее за дни с записями: ${avg} ккал` + (goalCal ? ` · дневная цель: ${goalCal} ккал` : '');
}

// ── Export / Import ──────────────────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  const data = { version: 1, exportedAt: new Date().toISOString(), foods, diary, goalCal };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calories-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

const importFile = document.getElementById('import-file');
document.getElementById('import-btn').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.foods)) { foods = data.foods; save('foods', foods); }
      if (data.diary && typeof data.diary === 'object') { diary = data.diary; save('diary', diary); }
      if ('goalCal' in data) { goalCal = data.goalCal; save('goalCal', goalCal); }
      renderDiary();
      renderFoods();
      renderStats();
      alert('Данные успешно импортированы.');
    } catch (err) {
      alert('Не удалось прочитать файл: ' + err.message);
    }
    importFile.value = '';
  };
  reader.readAsText(file);
});

// ── Init ─────────────────────────────────────────────────────────────────────
renderDiary();
renderFoods();
