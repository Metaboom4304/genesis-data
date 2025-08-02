// Инициализация карты
const map = L.map('map').setView([0, 0], 2);

// Подключение тайл-сервера (замените URL на свой, если нужно)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Логирование ошибок загрузки тайлов
map.on('tileerror', (errorEvent) => {
  console.error('Ошибка загрузки тайла:', errorEvent);
});
