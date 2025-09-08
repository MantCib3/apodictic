CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    region VARCHAR(50),
    published_date TIMESTAMP,
    sources JSON,
    quotes JSON
);

CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    indicator_name VARCHAR(100),
    value DECIMAL,
    timestamp TIMESTAMP,
    region VARCHAR(50)
);

CREATE TABLE demographic_stats (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100),
    value DECIMAL,
    region VARCHAR(50),
    year INTEGER
);
