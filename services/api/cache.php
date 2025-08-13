<?php
// services/api/cache.php
require_once __DIR__ . '/config.php';

function getCache(string $key): ?array {
    $query = http_build_query([
        'select'     => 'data,status,expires_at',
        'key'        => "eq.$key",
        'expires_at' => 'gt.' . gmdate('Y-m-d\TH:i:s\Z')
    ]);

    $curl = curl_init(SUPABASE_URL . "/rest/v1/tile_cache?$query");
    curl_setopt_array($curl, [
        CURLOPT_HTTPHEADER     => json_decode(SUPABASE_HEADERS, true),
        CURLOPT_RETURNTRANSFER => true
    ]);
    $resp = curl_exec($curl);
    curl_close($curl);

    $rows = json_decode($resp, true);
    return $rows[0]['data'] ?? null;
}

function upsertCache(string $key, string $url, array $data, int $ttl = 3600) {
    $payload = [
        'key'          => $key,
        'url'          => $url,
        'data'         => $data,
        'status'       => 200,
        'content_type' => 'application/json',
        'expires_at'   => gmdate('Y-m-d\TH:i:s\Z', time() + $ttl)
    ];

    $curl = curl_init(SUPABASE_URL . '/rest/v1/tile_cache');
    curl_setopt_array($curl, [
        CURLOPT_HTTPHEADER     => json_decode(SUPABASE_HEADERS, true),
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true
    ]);
    curl_exec($curl);
    curl_close($curl);
}
