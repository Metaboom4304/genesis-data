require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Проверка соединения с БД
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Подключение к базе данных успешно'))
  .catch(err => console.error('❌ Ошибка подключения к базе:', err));

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    process.env.TELEGRAM_URL
  ],
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Эндпоинты
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/api/users', async (req, res) => {
  const { telegram_id, first_name, last_name, username } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, first_name, last_name, username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username
       RETURNING *`,
      [telegram_id, first_name, last_name, username]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/marks', async (req, res) => {
  const { user_id, tile_id, mark_type, comment } = req.body;
  
  try {
    // Удаление предыдущей метки
    await pool.query(
      `DELETE FROM user_marks 
       WHERE user_id = $1 AND tile_id = $2 AND mark_type = $3`,
      [user_id, tile_id, mark_type]
    );
    
    // Сохранение новой метки (если не сброс)
    if (mark_type !== 'clear') {
      const result = await pool.query(
        `INSERT INTO user_marks (user_id, tile_id, mark_type, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, tile_id, mark_type, comment]
      );
      
      return res.json(result.rows[0]);
    }
    
    res.json({ message: 'Mark cleared' });
  } catch (error) {
    console.error('Ошибка сохранения метки:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/marks/:user_id', async (req, res) => {
  const userId = req.params.user_id;
  
  try {
    const result = await pool.query(
      `SELECT * FROM user_marks WHERE user_id = $1`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка загрузки меток:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tiles-cache', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tiles_cache 
       ORDER BY last_updated DESC 
       LIMIT 1`
    );
    
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Ошибка загрузки кеша:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tiles-cache', async (req, res) => {
  const { data } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO tiles_cache (data) 
       VALUES ($1) 
       RETURNING *`,
      [data]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка сохранения кеша:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/proxy/tile-info', async (req, res) => {
  try {
    const response = await fetch('https://back.genesis-of-ages.space/manage/get_tile_info.php');
    
    if (!response.ok) {
      throw new Error(`Remote server error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 CORS разрешен для: ${process.env.FRONTEND_URL}, ${process.env.TELEGRAM_URL}`);
});
