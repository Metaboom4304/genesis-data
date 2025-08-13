<?php
// services/api/get_tile_info_cached.php
require_once __DIR__ . '/cache.php';

$id  = $_GET['id'] ?? '';
$key = "get_tile_info?id=$id";
$url = "https://back.genesis-of-ages.space/manage/get_tile_info.php?id=$id";

// 1) Попытка взять из кэша
$data = getCache($key);
if ($data !== null) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// 2) Иначе запрос к внешнему сервису
$response = file_get_contents($url);
$data     = json_decode($response, true);

// 3) Сохранение в кэш
upsertCache($key, $url, $data);

// 4) Выдача результата клиенту
header('Content-Type: application/json');
echo json_encode($data);
