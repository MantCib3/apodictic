import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';

const ARTICLES_PER_PAGE = 6;

const Section = () => {
  const { section } = useParams();
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        let arts = data.articles || [];
        if (section !== 'latest' && section !== 'search') {
          arts = arts.filter(a => a.category?.toLowerCase() === section);
        }
        setArticles(arts);
        setFilteredArticles(arts);
      });
  }, [section]);

  useEffect(() => {
    let filtered = articles;
    if (keyword) {
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        a.lead?.toLowerCase().includes(keyword.toLowerCase()) ||
        a.content?.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    if (region) filtered = filtered.filter(a => a.region?.toLowerCase() === region);
    if (topic && section === 'latest') filtered = filtered.filter(a => a.category?.toLowerCase() === topic);
    if (date) filtered = filtered.filter(a => a.date?.startsWith(date));
    setFilteredArticles(filtered);
    setCurrentPage(1);
  }, [keyword, region, topic, date, articles, section]);

  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginated = filteredArticles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE);

  return (
    <div className="section-view">
      <h1>{section.charAt(0).toUpperCase() + section.slice(1)}</h1>
      <div className="search-filters">
        <input 
          type="text" 
          placeholder="Search..." 
          value={keyword} 
          onChange={e => setKeyword(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setKeyword(e.target.value);
            }
          }}
        />
        <select value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">All Regions</option>
          <option value="north-america">North America</option>
          <option value="europe">Europe</option>
          <option value="asia">Asia</option>
          <option value="africa">Africa</option>
          <option value="south-america">South America</option>
          <option value="australia">Australia</option>
        </select>
        {section === 'latest' && (
          <select value={topic} onChange={e => setTopic(e.target.value)}>
            <option value="">All Topics</option>
            <option value="world">World</option>
            <option value="events">Events</option>
            <option value="financial">Finance</option>
          </select>
        )}
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="section-articles" id="sectionResults">
        {paginated.length > 0 ? (
          paginated.map(article => (
            <div className="section-article-wrapper" key={article.id}>
              <ArticleCard article={article} type="standard" />
            </div>
          ))
        ) : (
          <div className="no-articles">No articles found.</div>
        )}
      </div>
      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Previous</button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>
            {i + 1}
          </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
      </div>
    </div>
  );
};

export default Section;