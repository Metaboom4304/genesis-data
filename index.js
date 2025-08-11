import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { addMark } from './markService.js';

// 🔐 Подключение к Supabase
const supabase = createClient(
  https://nysjreargnvyjmcirinp.supabase.co, // ← замени на свой URL
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q                // ← замени на свой ключ
);

// ✅ Telegram WebApp готов
window.Telegram.WebApp.ready();

// 📥 Получаем данные пользователя
const tgUser = window.Telegram.WebApp.initDataUnsafe.user;

// 🧠 Сохраняем пользователя в Supabase
async function syncUser(user) {
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', user.id)
    .single();

  if (!existingUser) {
    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code
      }]);

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
