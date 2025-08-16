import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔐 Supabase init (anon-key)
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
  if (!document.getElementById('debug-log')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="debug-log" style="
        position: absolute; bottom: 0; left: 0; right: 0;
        max-height: 120px; overflow: auto;
        background: rgba(0,0,0,0.7); color:#0f0; font: 12px/1.4 monospace;
        padding: 6px; z-index: 9999;"></div>
    `);
  }
  log('✅ DOM готов');

  const tg = window.Telegram?.WebApp;
  tg?.ready();
  log('🤖 Telegram WebApp ready');

  const tgUser = tg?.initDataUnsafe?.user || null;
  if (tgUser) {
    syncUser(tgUser);
    window.__tgUser = tgUser;
    log(`👤 TG user: ${tgUser.id} @${tgUser.username || ''}`);
  } else {
    log('👤 TG user: отсутствует (используем тестовый)');
  }

  document.body.classList.add('logged-in');

  // теперь initMap доступна и по window.initMap, и здесь локально
  initMap({ id: tgUser?.id || 'test-user' });
});

// 🧠 Сохранение/обновление пользователя в Supabase
async function syncUser(user) {
  try {
    const { error } = await supabase
      .from('users')
      .upsert([{
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username
      }], { onConflict: 'telegram_id' });

    if (error) {
      console.error('syncUser error:', error);
      log('⚠️ syncUser error (см. консоль)');
    } else {
      log('💾 Пользователь синхронизирован');
    }
  } catch (e) {
    console.error('syncUser fatal:', e);
    log('⚠️ syncUser fatal (см. консоль)');
  }
}

// 📜 Лог в debug-окно
function log(msg) {
  const el = document.getElementById('debug-log');
  if (el) el.innerHTML += `${msg}<br>`;
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
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  log('🗺️ Leaflet карта создана');

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  osm.addTo(map);
  log('🧱 Базовый слой добавлен');

  gridLayer = L.layerGroup().addTo(map);
  tileLayerGroup = L.layerGroup().addTo(map);
  userMarksLayer = L.layerGroup().addTo(map);

  map.on('moveend', debounce(updateLayers, 300));
  map.on('click', onMapClick);

  updateLayers();
}

// 🔢 Переводим координаты в ID тайла (шаг 0.05°)
function getTileId(lat, lng) {
  const ts = 0.05;
  const x = Math.floor(lat / ts);
  const y = Math.floor(lng / ts);
  return `${x}-${y}`;
}

// 🔄 Обновление слоёв
async function updateLayers() {
  try {
    gridLayer.clearLayers();
    tileLayerGroup.clearLayers();
    userMarksLayer.clearLayers();

    drawGrid();

    const center = map.getCenter();
    const tileId = getTileId(center.lat, center.lng);
    log(`📍 tileId: ${tileId}`);

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
        log(`⚠️ Tile API ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to load tile cache:', err);
      log('⚠️ Ошибка загрузки тайлов (см. консоль)');
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
      log('⚠️ Ошибка загрузки меток (см. консоль)');
    }
  } catch (e) {
    console.error('updateLayers fatal:', e);
    log('⛔ updateLayers fatal (см. консоль)');
  }
}

// ✏️ Рисуем сетку тайлов 0.05°
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
    log('✅ Метка добавлена');
    updateLayers();
  } catch (err) {
    console.error('add user mark error:', err);
    log('⛔ Не удалось сохранить метку (см. консоль)');
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

// 🚩 Экспорт initMap для Telegram WebApp
window.initMap = initMap;
