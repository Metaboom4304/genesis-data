// app.js
(async function() {
  const loadingEl = document.getElementById('loading');
  const mapEl = document.getElementById('map');

  // 1. Загрузка атмосферных фраз
  const meta = await fetch('meta-data.json').then(r => r.json());
  const phrases = meta.loading_phrases;
  let phraseIndex = 0;

  // 2. Загрузка фокуса и статуса
  const status = await fetch('map-status.json').then(r => r.json());
  const totalTiles = 22;
  const allTiles = [];
  let loadedCount = 0;

  // 3. Цикл загрузки tiles_01.json…tiles_22.json
  for (let i = 1; i <= totalTiles; i++) {
    const idx = String(i).padStart(2, '0');
    loadingEl.textContent = `${phrases[phraseIndex % phrases.length]} (${i}/${totalTiles})`;
    phraseIndex++;

    try {
      const tileSet = await fetch(`data/tiles_${idx}.json`).then(r => r.json());
      allTiles.push(...tileSet);
      loadedCount++;
    } catch(e) {
      console.error(`Ошибка загрузки tiles_${idx}.json`, e);
    }
  }

  // 4. Убираем загрузку
  loadingEl.style.display = 'none';

  // 5. Рендер тайлов
  allTiles.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'tile';

    // Координаты: раскладка по строкам 11 тайлов
    const id = parseInt(tile.id_tile);
    const x = (id - 1) % 11;
    const y = Math.floor((id - 1) / 11);

    el.style.left = `${x * 32}px`;
    el.style.top = `${y * 32}px`;
    el.style.backgroundImage = `url('${tile.img_photo}')`;

    // Подсветка владельца
    if (tile.has_owner === true || tile.has_owner === 'true') {
      el.classList.add('owned');
    }

    mapEl.append(el);
  });

  // 6. Отрисовка фокусной зоны
  if (status.focusArea) {
    const [[x1,y1],[x2,y2]] = status.focusArea;
    const rect = document.createElement('div');
    rect.className = 'focus-area';
    rect.style.left = `${x1 * 32}px`;
    rect.style.top = `${y1 * 32}px`;
    rect.style.width = `${(x2 - x1 + 1) * 32}px`;
    rect.style.height = `${(y2 - y1 + 1) * 32}px`;
    mapEl.append(rect);
  }
})();
