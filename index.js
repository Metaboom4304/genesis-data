import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔐 Supabase Init (анон-ключ)
const supabase = createClient(
  'https://nysjreargnvyjmcirinp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'
);
window.supabase = supabase;

// ✅ Telegram WebApp: получаем данные пользователя
document.addEventListener('DOMContentLoaded', () => {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  console.log('tgUser:', tgUser);
  if (tgUser) syncUser(tgUser);

  window.Telegram?.WebApp?.ready?.();
});

const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

// 🧠 Сохраняем пользователя в Supabase
async function syncUser(user) {
  console.log(`[user sync] ${user.id} - ${user.username}`);

  const { error: insertError } = await supabase.from('users').upsert([{
    telegram_id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username
  }], { onConflict: 'telegram_id' });

  if (insertError) {
    console.error('❌ Ошибка при добавлении пользователя:', insertError);
  } else {
    console.log('✅ Пользователь синхронизирован!');
  }
}

// 🗺️ Инициализация слоя меток
const marksLayer = L.layerGroup().addTo(map);

// 📦 Вычисление ID тайла по координатам
function getTileId(lat, lng) {
  const tileSize = 0.05;
  const tileX = Math.floor(lat / tileSize);
  const tileY = Math.floor(lng / tileSize);
  return `${tileX}-${tileY}`;
}

// 📍 Подгрузка пользовательских меток
async function updateMarks() {
  marksLayer.clearLayers();

  const center = map.getCenter();
  const tileId = getTileId(center.lat, center.lng);

  const { data: marks, error } = await supabase
    .from('user_marks')
    .select('*')
    .eq('tile_id', tileId);

  if (error) {
    console.error('❌ Ошибка загрузки меток:', error);
    return;
  }

  if (!marks || marks.length === 0) {
    console.log(`Нет пользовательских меток для тайла ${tileId}`);
    return;
  }

  marks.forEach(mark => {
    L.marker([mark.lat, mark.lng])
      .addTo(marksLayer)
      .bindPopup(`
        <b>${mark.title}</b><br>
        ${mark.description}<br>
        <i>Тип: ${mark.resource_type}</i>
      `);
  });
}

map.on('moveend', updateMarks);

// 🖱️ Добавление пользовательской метки по клику
map.on('click', async (e) => {
  const { lat, lng } = e.latlng;

  const title = prompt('Название метки:');
  if (!title) return;

  const description = prompt('Описание метки:') || '';
  const resourceType = prompt('Тип ресурса (например, gold, wood):') || 'unknown';
  const tileId = getTileId(lat, lng);

  const { error } = await supabase.from('user_marks').insert([{
    user_id: tgUser?.id || null,
    tile_id: tileId,
    lat,
    lng,
    title,
    description,
    resource_type: resourceType
  }]);

  if (error) {
    console.error('❌ Ошибка при добавлении метки:', error);
    alert('Ошибка при сохранении метки');
  } else {
    console.log('✅ Пользовательская метка добавлена!');
    updateMarks(); // 🔄 обновляем слой
  }
});
