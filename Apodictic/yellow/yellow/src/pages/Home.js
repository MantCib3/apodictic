import React, { useState, useEffect, useMemo } from 'react';
import ArticleCard from '../components/ArticleCard';
import config from '../config';

const Home = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/articles`);
        console.log('Response status:', res.status);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Received data:', data);
        
        if (!data.articles || !Array.isArray(data.articles)) {
          throw new Error('Invalid data format received');
        }
        
        setArticles(data.articles);
      } catch (error) {
        console.error('Error fetching articles:', error);
        setError(error.message);
      }
    };

    fetchArticles();
  }, []);

  const featureArticle = useMemo(() => articles[0], [articles]);
  const latestArticles = useMemo(() => articles.slice(1, 4), [articles]);
  const worldArticles = useMemo(() => 
    articles.filter(a => a.category?.toLowerCase() === 'world').slice(0, 3), 
    [articles]
  );
  const eventsArticles = useMemo(() => 
    articles.filter(a => a.category?.toLowerCase() === 'events').slice(0, 3),
    [articles]
  );
  const financeArticles = useMemo(() => {
    const financial = articles.filter(a => a.category?.toLowerCase() === 'financial');
    return {
      feature: financial[0],
      latest: financial.slice(1, 4)
    };
  }, [articles]);

  return (
    <>
      {error ? (
        <div className="error-message">Error loading articles: {error}</div>
      ) : articles.length === 0 ? (
        <div className="loading">Loading articles...</div>
      ) : (
        <>
          <div className="main-content">
            <ArticleCard article={featureArticle} type="feature" />
            <div className="latest-section" id="latest-section">
              <h3>Latest</h3>
              {latestArticles.map(a => <ArticleCard key={a.id} article={a} type="event" />)}
            </div>
          </div>
          <div className="lower-sections">
            <div className="world-section" id="world">
              <h2>World</h2>
              {worldArticles.length > 0 ? (
                worldArticles.map(a => <ArticleCard key={a.id} article={a} />)
              ) : (
                <div className="no-articles">No world articles available.</div>
              )}
            </div>
            <div className="events-section" id="events">
              <h2>Events</h2>
              {eventsArticles.length > 0 ? (
                eventsArticles.map(a => <ArticleCard key={a.id} article={a} />)
              ) : (
                <div className="no-articles">No events available.</div>
              )}
            </div>
          </div>
          <div className="financial-section">
            <h2>Finance</h2>
            <div className="finance-content">
              <ArticleCard article={financeArticles.feature} type="feature" />
              <div className="finance-latest-section">
                <h3>Latest</h3>
                {financeArticles.latest.map(a => <ArticleCard key={a.id} article={a} type="event" />)}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Home;