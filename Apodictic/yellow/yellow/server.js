const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(xss()); // Sanitize input
app.use(limiter); // Rate limiting
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  credentials: true
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    next();
  });
}

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  }
})); // Serve React build from the correct directory

// API Endpoint for articles
// Sanitize article data before sending to client
const sanitizeArticle = (article) => {
  return {
    ...article,
    title: article.title ? article.title.replace(/<[^>]*>/g, '') : '',
    lead: article.lead ? article.lead.replace(/<[^>]*>/g, '') : '',
    image: article.image ? encodeURI(article.image) : ''
  };
};

app.get('/api/articles', async (req, res) => {
  try {
    // Input validation for query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    
    console.log('Attempting to read DB.json from:', path.join(__dirname, 'DB.json'));
    const data = await fs.readFile(path.join(__dirname, 'DB.json'), 'utf8');
    console.log('Successfully read DB.json');
    const parsedData = JSON.parse(data);
    
    if (!parsedData.articles || !Array.isArray(parsedData.articles)) {
      return res.status(500).json({ error: 'Invalid data format in DB.json' });
    }

    // Sanitize all articles
    const sanitizedArticles = parsedData.articles.map(sanitizeArticle);
    
    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedArticles = sanitizedArticles.slice(startIndex, endIndex);
    
    res.json({
      articles: paginatedArticles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(sanitizedArticles.length / limit),
        totalArticles: sanitizedArticles.length
      }
    });
  } catch (err) {
    console.error('Error reading DB.json:', err);
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Serve React app for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});