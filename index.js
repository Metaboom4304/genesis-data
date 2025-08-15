import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔐 Supabase Init (anon-key)
const supabase = createClient(
  'https://nysjreargnvyjmcirinp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UzpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'
);
window.supabase = supabase;

// Глобальные переменные
let map;
let gridLayer;
let tileLayerGroup;
let userMarksLayer;

// 🚀 Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();

  const tgUser = tg?.initDataUnsafe?.user;
  if (tgUser) {
    syncUser(tgUser);
    window.__tgUser = tgUser;
  }

  // Разблокируем карту
  document.body.classList.add('logged-in');

  // Инициализация карты с передачей ID
  initMap({ id: tgUser?.id || 'test-user' });
});

// 🧠 Сохраняем/обновляем пользователя в Supabase
async function syncUser(user) {
  const { error } = await supabase
    .from('users')
    .upsert([{
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username
    }], { onConflict: 'telegram_id' });

  if (error) console.error('syncUser error:', error);
}

// 📜 Лог в debug-окно
function log(msg) {
  const el = document.getElementById('debug-log');
  if (el) el.innerHTML += msg + '<br>';
}

// 🗺️ Инициализация карты и слоёв
function initMap(user) {
  log('🟢 initMap() запущен');
  log('👤 Пользователь: ' + (user?.id || 'нет данных'));

  map = L.map('map', {
    center: [49.25, -123.10],
    zoom: 6,
    minZoom: 3,
    maxZoom: 10,
    attributionControl: false,
    zoomControl: false
  });

  log('🗺️ Leaflet карта создана');

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  osm.addTo(map);
  log('🧱 Базовый слой добавлен');

  // Группы слоёв
  gridLayer = L.layerGroup().addTo(map);
  tileLayerGroup = L.layerGroup().addTo(map);
  userMarksLayer = L.layerGroup().addTo(map);

  map.on('moveend', debounce(updateLayers, 300));
  map.on('click', onMapClick);

  updateLayers();
}

// 🔢 Переводим координаты в ID тайла
function getTileId(lat, lng) {
  const ts = 0.05;
  const x = Math.floor(lat / ts);
  const y = Math.floor(lng / ts);
  return `${x}-${y}`;
}

// 🔄 Обновление слоёв
async function updateLayers() {
  gridLayer.clearLayers();
  tileLayerGroup.clearLayers();
  userMarksLayer.clearLayers();

  drawGrid();

  const center = map.getCenter();
  const tileId = getTileId(center.lat, center.lng);

  // 1) Тайловая инфа
  try {
    const res = await fetch(`/services/api/get_tile_info_cached.php?id=${tileId}`);
    if (res.ok) {
      const info = await res.json();

      if (Array.isArray(info.tiles)) {
        info.tiles.forEach(t => {
          const b = tileToBounds(t.z, t.x, t.y);
          L.rectangle(b, { color: '#f60', weight: 1, fillOpacity: 0.2, interactive: false })
            .addTo(tileLayerGroup);
        });
      }

      if (Array.isArray(info.points)) {
        info.points.forEach(p => {
          L.circleMarker([p.lat, p.lng], { radius: 4, color: '#f60', fillOpacity: 1 })
            .addTo(tileLayerGroup)
            .bindPopup(p.label || 'Point');
        });
      }

      if (Array.isArray(info.bounds) && info.bounds.length === 4) {
        map.fitBounds([
          [info.bounds[0], info.bounds[1]],
          [info.bounds[2], info.bounds[3]]
        ]);
      }
    } else {
      console.warn('Tile cache fetch error:', res.status);
    }
  } catch (err) {
    console.error('Failed to load tile cache:', err);
  }

  // 2) Метки пользователей
  try {
    const { data: marks, error } = await supabase
      .from('user_marks')
      .select('*')
      .eq('tile_id', tileId);

    if (error) throw error;

    (marks || []).forEach(m => {
      L.marker([m.lat, m.lng])
        .addTo(userMarksLayer)
        .bindPopup(`
          <b>${m.title}</b><br>
          ${m.description}<br>
          <i>Тип: ${m.resource_type}</i>
        `);
    });
  } catch (err) {
    console.error('user_marks fetch error:', err);
  }
}

// ✏️ Рисуем сетку
function drawGrid() {
  const ts = 0.05;
  const b = map.getBounds();
  const x0 = Math.floor(b.getSouth() / ts);
  const x1 = Math.floor(b.getNorth() / ts);
  const y0 = Math.floor(b.getWest() / ts);
  const y1 = Math.floor(b.getEast() / ts);

  for (let xi = x0; xi <= x1; xi++) {
    for (let yi = y0; yi <= y1; yi++) {
      const lat = xi * ts;
      const lng = yi * ts;
      L.rectangle([[lat, lng], [lat + ts, lng + ts]], {
        color: '#3388ff',
        weight: 1,
        fill: false,
        interactive: false
      }).addTo(gridLayer);
    }
  }
}

// 🖱️ Клик по карте — добавление метки
async function onMapClick(e) {
  const { lat, lng } = e.latlng;
  const title = prompt('Название метки:');
  if (!title) return;
  const description = prompt('Описание метки:') || '';
  const resourceType = prompt('Тип ресурса (gold, wood):') || 'unknown';
  const tileId = getTileId(lat, lng);

  try {
    const { error } = await supabase.from('user_marks').insert([{
      user_id: window.__tgUser?.id ?? null,
      tile_id: tileId,
      lat,
      lng,
      title,
      description,
      resource_type: resourceType
    }]);
    if (error) throw error;
    updateLayers();
  } catch (err) {
    console.error('add user mark error:', err);
    alert('Не удалось сохранить метку');
  }
}

// ⏳ Дебаунс
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ↔️ Перевод z/x/y в границы
function tileToBounds(z, x, y) {
  const size = 256;
  const nw = map.unproject([x * size, y * size], z);
  const se = map.unproject([(x + 1) * size, (y + 1) * size], z);
  return [nw, se];
}
