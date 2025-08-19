require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Улучшенные настройки CORS
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://genesis-data.onrender.com',
    'https://web.telegram.org',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Проверка соединения с БД
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Подключение к базе данных успешно'))
  .catch(err => console.error('❌ Ошибка подключения к базе:', err));

// Эндпоинты
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

app.post('/api/users', async (req, res) => {
  try {
    const { telegram_id, first_name, last_name, username } = req.body;
    
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
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/marks', async (req, res) => {
  try {
    const { user_id, tile_id, mark_type, comment } = req.body;
    
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
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/marks/:user_id', async (req, res) => {
  try {
    const userId = req.params.user_id;
    
    const result = await pool.query(
      `SELECT * FROM user_marks WHERE user_id = $1`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка загрузки меток:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
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
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/tiles-cache', async (req, res) => {
  try {
    const { data } = req.body;
    
    const result = await pool.query(
      `INSERT INTO tiles_cache (data) 
       VALUES ($1) 
       RETURNING *`,
      [data]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка сохранения кеша:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/proxy/tile-info', async (req, res) => {
  try {
    console.log('Запрос данных с основного сервера...');
    const response = await fetch('https://back.genesis-of-ages.space/manage/get_tile_info.php', {
      timeout: 10000 // 10 секунд таймаут
    });
    
    if (!response.ok) {
      throw new Error(`Remote server error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Получено данных:', Object.keys(data).length);
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: error.message,
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 База данных: ${process.env.DATABASE_URL ? 'Настроена' : 'Не настроена'}`);
});
