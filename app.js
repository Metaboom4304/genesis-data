// app.js

// 1. Подключение базовых слоёв
const baseLayers = {
  "OpenStreetMap": L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  ),
  "Satellite": L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Esri", maxZoom: 19 }
  ),
};

const overlayLayers = {}; // сюда можно добавить GeoJSON, маркеры и т.д.

// 2. Инициализация карты
const map = L.map("map", {
  center: [0, 0],
  zoom: 2,
  layers: [baseLayers.OpenStreetMap],
  zoomControl: true,
});

// добавляем контрол переключения слоёв
const layerControl = L.control.layers(baseLayers, overlayLayers).addTo(map);

// кастомная кнопка, имитирующая клик по контролу слоёв
document
  .getElementById("custom-layer-toggle")
  .addEventListener("click", () => {
    const ctrl = document.querySelector(".leaflet-control-layers-toggle");
    if (ctrl) ctrl.click();
  });

// --------------------------------------
// 3. Загрузка и отрисовка GeoJSON тайлов
// предполагаем, что где-то выше у вас определён объект `data` с GeoJSON
let tileLayer;
const tilesById = {};

// Инициализируем слой с тайлами
function initTiles() {
  tileLayer = L.geoJSON(data, {
    onEachFeature: onEachTile,
  }).addTo(map);

  // запомним каждый фич по ID
  data.features.forEach((f) => {
    tilesById[f.properties.id] = f;
  });

  // подогнать карту под границы всех тайлов
  map.fitBounds(tileLayer.getBounds());
}

initTiles();

// 3.1 — Поиск тайла + кнопка очистки
const searchInput = document.getElementById("tile-search");
const searchClear = document.getElementById("search-clear");

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  filterTiles("");
});

searchInput.addEventListener("input", (e) => {
  filterTiles(e.target.value);
});

function filterTiles(query) {
  const q = query.trim().toLowerCase();

  // удаляем старый слой
  if (tileLayer) {
    map.removeLayer(tileLayer);
  }

  // создаём новый слой с фильтром по ID или по метке
  tileLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: data.features.filter((f) => {
        if (!q) return true;
        const id = f.properties.id.toString();
        const lbl = (f.properties.label || "").toLowerCase();
        return id.includes(q) || lbl.includes(q);
      }),
    },
    { onEachFeature: onEachTile }
  ).addTo(map);
}

// 3.2 — Нормальные подписи (tooltips)
function onEachTile(feature, layer) {
  const label = feature.properties.label || feature.properties.id;
  layer.bindTooltip(label, {
    permanent: true,
    direction: "center",
    className: "tile-label",
  });

  // добавим контекстное меню: добавить в избранное
  layer.on("contextmenu", () => {
    addFav(feature);
  });
}

// --------------------------------------
// 3.3 — Избранное
let favorites = JSON.parse(localStorage.getItem("favs") || "[]");

function renderFavorites() {
  const ul = document.getElementById("favorites-list");
  ul.innerHTML = favorites
    .map(
      (tile) => `
    <li data-id="${tile.id}">
      ${tile.label}
      <button onclick="goToTile('${tile.id}')">Перейти</button>
      <button onclick="removeFav('${tile.id}')">×</button>
    </li>`
    )
    .join("");
}

function addFav(feature) {
  const id = feature.properties.id.toString();
  const label = feature.properties.label || id;
  if (!favorites.find((t) => t.id === id)) {
    favorites.push({ id, label });
    localStorage.setItem("favs", JSON.stringify(favorites));
    renderFavorites();
  }
}

function removeFav(id) {
  favorites = favorites.filter((t) => t.id !== id);
  localStorage.setItem("favs", JSON.stringify(favorites));
  renderFavorites();
}

function goToTile(id) {
  const feat = tilesById[id];
  if (!feat) return;
  const layer = L.geoJSON(feat);
  map.fitBounds(layer.getBounds());
}

// экспортим в глобал для кнопок в списке
window.addFav = addFav;
window.removeFav = removeFav;
window.goToTile = goToTile;

// сразу отрисуем избранное
renderFavorites();

// --------------------------------------
// 3.4 — Метки с комментарием
map.on("click", (e) => {
  const comment = prompt("Комментарий для метки:");
  if (!comment) return;
  const marker = L.marker(e.latlng).addTo(map);
  marker.bindPopup(comment);
  saveMarker(e.latlng, comment);
});

function saveMarker(latlng, text) {
  const arr = JSON.parse(localStorage.getItem("markers") || "[]");
  arr.push({ lat: latlng.lat, lng: latlng.lng, text });
  localStorage.setItem("markers", JSON.stringify(arr));
}

(function loadMarkers() {
  const arr = JSON.parse(localStorage.getItem("markers") || "[]");
  arr.forEach(({ lat, lng, text }) => {
    L.marker([lat, lng]).addTo(map).bindPopup(text);
  });
})();

// --------------------------------------
// 3.5 — Лог ошибки тайла
map.on("tileerror", (err) => {
  console.error("Ошибка загрузки тайла:", err);
});
```
