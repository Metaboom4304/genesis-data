// app.js
(async function() {
  const loadingEl = document.getElementById('loading');
  const mapEl = document.getElementById('map');

  // 1. Загрузка meta-data.json
  const meta = await fetch('meta-data.json').then(r => r.json());
  const phrases = meta.loading_phrases;

  // 2. Загрузка map-status.json
  const status = await fetch('map-status.json').then(r => r.json());
  const totalTiles = status.totalTiles || 22;
  let loadedCount = 0;

  // 3. Цикл загрузки файлов tiles_XX.json
  const allTiles = [];
  for (let i = 1; i <= totalTiles; i++) {
    const idx = String(i).padStart(2, '0');
    loadingEl.textContent = `${phrases[loadedCount % phrases.length]} (${loadedCount+1}/${totalTiles})`;
    const data = await fetch(`data/tiles_${idx}.json`).then(r => r.json());
    allTiles.push(...data.tiles);
    loadedCount++;
  }

  // 4. Убираем индикатор загрузки
  loadingEl.style.display = 'none';

  // 5. Рендерим тайлы
  allTiles.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.left = `${tile.x * 32}px`;
    el.style.top = `${tile.y * 32}px`;
    el.style.backgroundImage = `url('${tile.url}')`;

    // подсветка своих фрагментов
    if (status.ownedTiles
      .some(t => t.x === tile.x && t.y === tile.y)) {
      el.classList.add('owned');
    }

    mapEl.append(el);
  });

  // 6. Рисуем зону фокуса
  if (status.focusArea) {
    const [[x1,y1],[x2,y2]] = status.focusArea;
    const rect = document.createElement('div');
    rect.className = 'focus-area';
    rect.style.left = `${x1*32}px`;
    rect.style.top = `${y1*32}px`;
    rect.style.width = `${(x2 - x1 + 1)*32}px`;
    rect.style.height = `${(y2 - y1 + 1)*32}px`;
    mapEl.append(rect);
  }
})();
