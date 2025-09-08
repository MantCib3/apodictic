import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';

const Article = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        const data = await res.json();
        const arts = data.articles || [];
        const found = arts.find(a => a.id === id);
        setArticle(found);
        if (found) {
          const related = arts.filter(a => 
            a.id !== id && a.category === found.category
          ).slice(0, 3);
          setRelatedArticles(related);
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      }
    };
    fetchArticles();
  }, [id]);

  if (!article) {
    return <div className="loading">Loading...</div>;
  }

  const formattedDate = article.date ? 
    new Date(article.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'Unknown Date';

  const handleShare = () => {
    const shareData = { 
      title: article.title || 'Article', 
      url: window.location.href 
    };
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      alert(`Share this URL: ${window.location.href}`);
    }
  };

  return (
    <div className="article-detail-view">
      <div className="article-detail">
        <h1>{article.title}</h1>
        <div className="date">{formattedDate}</div>
        <div className="article-image" style={{ backgroundImage: `url(${article.image || '/assets/logo.png'})` }}></div>
        <div className="dot-points">
          <ul>{article.dot_points?.map((p, i) => <li key={i}>{p}</li>) || <li>No key points.</li>}</ul>
        </div>
        <div className="content">{article.content}</div>
        <div className="article-quotes-section">
          <div className="quotes-container">
            {article.quotes?.map((q, i) => (
              <div className="quote-box" key={i}>
                <div className="quote">{q.text}</div>
                <div className="quote-source">- {q.speaker || q.source}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="sources">
          <h3>Sources</h3>
          <ul>
            {article.sources?.map((s, i) => (
              <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>
            )) || <li>No sources.</li>}
          </ul>
        </div>
        <div className="share-button">
          <button onClick={handleShare}><i className="fas fa-share"></i> Share</button>
        </div>
      </div>
      <div className="related-articles">
        <h2>Related Articles</h2>
        <div className="related-articles-container">
          {relatedArticles.map(article => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              type="related" 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Article;