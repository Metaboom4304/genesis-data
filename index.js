console.log('initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);

const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
console.log('tgUser:', tgUser); // 💥 Должно показать ID, имя и т.д.
syncUser(tgUser);

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { addMark } from './markService.js';
import { loadTileMarks } from './services/tileCacheService.js'; // ✅ добавлено

// 🔐 Подключение к Supabase
const supabase = createClient(
  'https://nysjreargnvyjmcirinp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'
);

// ✅ Telegram WebApp готов
window.Telegram.WebApp.ready();

// 📥 Получаем данные пользователя
const tgUser = window.Telegram.WebApp.initDataUnsafe.user;

// 🧠 Сохраняем пользователя в Supabase
async function syncUser(user) {
  console.log(`[user sync] ${user.id} - ${user.username}`);

  await supabase.from('users').insert([{
    telegram_id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username
  }]);
}


    if (insertError) {
      console.error('❌ Ошибка при добавлении пользователя:', insertError);
    } else {
      console.log('✅ Пользователь добавлен!');
    }
  } else {
    console.log('👤 Пользователь уже есть в базе.');
  }
}

syncUser(tgUser);

// 📍 Подгрузка тайлов при перемещении карты
map.on('moveend', async () => {
  const center = map.getCenter();
  const tileId = `${Math.floor(center.lat)}-${Math.floor(center.lng)}`;
  const marks = await loadTileMarks(tileId);

  marks.forEach(mark => {
    L.marker([mark.lat, mark.lng])
      .addTo(map)
      .bindPopup(`<b>${mark.title}</b><br>${mark.description}`);
  });
});
