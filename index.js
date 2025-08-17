import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Инициализируем Supabase
const supabase = createClient(
  'https://nysjreargnvyjmcirinp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UzpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'
);
window.supabase = supabase;

// Утилита логирования
function log(msg) {
  console.log(msg);
  const el = document.getElementById('debug-log');
  if (el) el.innerHTML += `${msg}<br>`;
}

// Глобальные переменные карты
let map, gridLayer, tileLayerGroup, userMarksLayer;

// Запускаем инициализацию после полной загрузки
window.addEventListener('load', () => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();

  const tgUser = tg?.initDataUnsafe?.user || null;
  if (tgUser) {
    syncUser(tgUser);
    window.__tgUser = tgUser;
    log(`👤 TG user: ${tgUser.first_name}`);
  } else {
    log('👤 no TG user, switching to test');
  }

  document.body.classList.add('logged-in');
  initMap({ id: tgUser?.id || 'test-user' });
});

// Синхронизация пользователя в Supabase
async function syncUser(user) {
  try {
    const { error } = await supabase
      .from('users')
      .upsert(
        [{
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username
        }],
        { onConflict: 'telegram_id' }
      );
    if (error) throw error;
    log('💾 User synced');
  } catch (e) {
    console.error(e);
    log('⚠️ syncUser failed');
  }
}

// Инициализация карты и слоёв
function initMap(user) {
  log('🟢 initMap()');
  log(`👤 user id: ${user.id}`);

  map = L.map('map', {
    center: [49.25, -123.10],
    zoom: 6,
    minZoom: 3,
    maxZoom: 10,
    attributionControl: false,
    zoomControl: false
  });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    .addTo(map);
  gridLayer = L.layerGroup().addTo(map);
  tileLayerGroup = L.layerGroup().addTo(map);
  userMarksLayer = L.layerGroup().addTo(map);

  map.on('moveend', debounce(updateLayers, 300));
  map.on('click', onMapClick);

  updateLayers();
}

// Получаем ID тайла
function getTileId(lat, lng) {
  const ts = 0.05;
  return `${Math.floor(lat/ts)}-${Math.floor(lng/ts)}`;
}

// Обновляем слои
async function updateLayers() {
  gridLayer.clearLayers();
  tileLayerGroup.clearLayers();
  userMarksLayer.clearLayers();
  drawGrid();

  const { lat, lng } = map.getCenter();
  const tileId = getTileId(lat, lng);
  log(`📍 tileId: ${tileId}`);

  // fetch tiles info
  try {
    const res = await fetch(`/services/api/get_tile_info_cached.php?id=${tileId}`);
    if (res.ok) {
      const info = await res.json();
      (info.tiles || []).forEach(t => {
        L.rectangle(tileToBounds(t.z, t.x, t.y), {
          color:'#f60', weight:1, fillOpacity:0.2
        }).addTo(tileLayerGroup);
      });
      (info.points || []).forEach(p => {
        L.circleMarker([p.lat,p.lng], {
          radius:4, color:'#f60', fillOpacity:1
        }).addTo(tileLayerGroup)
          .bindPopup(p.label||'Point');
      });
      if (info.bounds?.length===4) {
        map.fitBounds([
          [info.bounds[0],info.bounds[1]],
          [info.bounds[2],info.bounds[3]]
        ]);
      }
    } else {
      log(`⚠️ tile API ${res.status}`);
    }
  } catch (e) {
    log('⚠️ tile fetch error');
  }

  // fetch user marks
  try {
    const { data: marks, error } = await supabase
      .from('user_marks')
      .select('*')
      .eq('tile_id', tileId);
    if (error) throw error;
    (marks||[]).forEach(m => {
      L.marker([m.lat, m.lng])
        .addTo(userMarksLayer)
        .bindPopup(
          `<b>${m.title}</b><br>${m.description}<br><i>${m.resource_type}</i>`
        );
    });
  } catch (e) {
    log('⚠️ marks fetch error');
  }
}

// Рисуем сетку
function drawGrid() {
  const ts = 0.05;
  const b = map.getBounds();
  const x0 = Math.floor(b.getSouth()/ts);
  const x1 = Math.floor(b.getNorth()/ts);
  const y0 = Math.floor(b.getWest()/ts);
  const y1 = Math.floor(b.getEast()/ts);
  for (let xi=x0; xi<=x1; xi++) {
    for (let yi=y0; yi<=y1; yi++) {
      L.rectangle(
        [[xi*ts, yi*ts], [xi*ts+ts, yi*ts+ts]],
        { color:'#3388ff', weight:1, fill:false }
      ).addTo(gridLayer);
    }
  }
}

// Клик по карте
async function onMapClick(e) {
  const { lat, lng } = e.latlng;
  const title = prompt('Название метки:');
  if (!title) return;
  const desc = prompt('Описание:')||'';
  const type = prompt('Тип (gold, wood):')||'unknown';
  const tileId = getTileId(lat, lng);
  try {
    const { error } = await supabase.from('user_marks').insert([{
      user_id: window.__tgUser?.id || null,
      tile_id: tileId, lat, lng,
      title, description:desc, resource_type:type
    }]);
    if (error) throw error;
    log('✅ mark added');
    updateLayers();
  } catch {
    log('⛔ add mark failed');
    alert('Не удалось сохранить метку');
  }
}

// Дебаунс
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...a), ms);
  };
}

// z/x/y → bounds
function tileToBounds(z, x, y) {
  const size=256;
  const nw=map.unproject([x*size,y*size], z);
  const se=map.unproject([(x+1)*size,(y+1)*size], z);
  return [nw,se];
}

// Экспорт для Telegram
window.initMap = initMap;
