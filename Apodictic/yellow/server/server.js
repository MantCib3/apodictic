const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/yellow'
});

// Middleware
app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.get('/api/v1/articles', async (req, res) => {
  try {
    const { category, region, startDate, endDate } = req.query;
    let query = 'SELECT * FROM articles WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (region) {
      params.push(region);
      query += ` AND region = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND published_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND published_date <= $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/market-data', authenticateToken, async (req, res) => {
  try {
    const { indicator, region, startDate, endDate } = req.query;
    let query = 'SELECT * FROM market_data WHERE 1=1';
    const params = [];

    if (indicator) {
      params.push(indicator);
      query += ` AND indicator_name = $${params.length}`;
    }
    if (region) {
      params.push(region);
      query += ` AND region = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection for real-time updates
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    // Handle incoming messages
    const data = JSON.parse(message);
    
    // Broadcast updates to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
