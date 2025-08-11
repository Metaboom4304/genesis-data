import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function addMark(userId, tileId, lat, lng, title, description, resourceType) {
  const { data, error } = await supabase
    .from('user_marks')
    .insert([{ user_id, tile_id, lat, lng, title, description, resource_type: resourceType }]);

  if (error) console.error(error);
  else console.log('✅ Отметка добавлена:', data);
}
