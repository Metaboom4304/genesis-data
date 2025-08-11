import { supabase } from './supabaseClient.js';

const TILE_EXPIRATION_MINUTES = 10;
const TILE_API_URL = 'https://back.genesis-of-ages.space/manage/get_tile_info.php?tile_id=';

/**
 * Проверяет, есть ли свежий тайл в Supabase
 */
async function getTileFromCache(tileId) {
  const { data, error } = await supabase
    .from('tile_cache')
    .select('marks, last_updated')
    .eq('tile_id', tileId)
    .single();

  if (error || !data) return null;

  const now = Date.now();
  const updatedAt = new Date(data.last_updated).getTime();
  const diffMinutes = (now - updatedAt) / 1000 / 60;

  if (diffMinutes < TILE_EXPIRATION_MINUTES) {
    return data.marks;
  }

  return null; // устарело
}

/**
 * Загружает тайл с сервера
 */
async function fetchTileFromServer(tileId) {
  const response = await fetch(`${TILE_API_URL}${tileId}`);
  const data = await response.json();
  return data.marks || [];
}

/**
 * Сохраняет тайл в Supabase
 */
async function saveTileToCache(tileId, marks) {
  await supabase
    .from('tile_cache')
    .upsert([
      {
        tile_id: tileId,
        marks,
        last_updated: new Date().toISOString()
      }
    ]);
}

/**
 * Основная функция: получить тайл (из кэша или сервера)
 */
export async function loadTileMarks(tileId) {
  let marks = await getTileFromCache(tileId);

  if (!marks) {
    marks = await fetchTileFromServer(tileId);
    await saveTileToCache(tileId, marks);
  }

  return marks;
}
