import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 🔐 Подключение к Supabase
const supabase = createClient(
  'https://YOUR_PROJECT_ID.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // ⚠️ Используй service_role для записи
);

// 📁 Путь к папке с JSON-файлами
const dataFolder = './data';

// 📦 Чтение всех файлов
const files = fs.readdirSync(dataFolder).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(dataFolder, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const tiles = JSON.parse(raw);

  for (const tile of tiles) {
    const { error } = await supabase.from('tiles').upsert([{
      id_tile: tile.id_tile,
      img_photo: tile.img_photo,
      iron: parseInt(tile.iron),
      limestone: parseInt(tile.limestone),
      copper: parseInt(tile.copper),
      platinum: parseInt(tile.platinum),
      silver: parseInt(tile.silver),
      tungsten: parseInt(tile.tungsten),
      aluminum: parseInt(tile.aluminum),
      gold: parseInt(tile.gold),
      titanium: parseInt(tile.titanium),
      rare_earth_elements: parseInt(tile.rare_earth_elements),
      uranium: parseInt(tile.uranium),
      klan_type: parseInt(tile.klan_type),
      has_owner: tile.has_owner
    }]);

    if (error) {
      console.error(`❌ Ошибка при загрузке ${tile.id_tile}:`, error.message);
    } else {
      console.log(`✅ Загружен тайл ${tile.id_tile}`);
    }
  }
}
