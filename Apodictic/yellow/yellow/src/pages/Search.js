import React, { useState, useEffect } from 'react';
import ArticleCard from '../components/ArticleCard';

const Search = () => {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searching, setSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 6;

  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data.articles || []));
  }, []);

  const handleSearch = () => {
    setSearching(true);
    setCurrentPage(1);
    const filtered = articles.filter(article => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        article.title?.toLowerCase().includes(searchLower) ||
        article.lead?.toLowerCase().includes(searchLower) ||
        article.content?.toLowerCase().includes(searchLower);

      const matchesCategory = !category || 
        article.category?.toLowerCase() === category.toLowerCase();

      const matchesRegion = !region || 
        article.sources?.some(source => source.url.toLowerCase().includes(region.toLowerCase()));

      const articleDate = article.date ? new Date(article.date) : null;
      const matchesDateFrom = !dateFrom || !articleDate || 
        articleDate >= new Date(dateFrom);

      return matchesSearch && matchesCategory && matchesRegion && matchesDateFrom;
    });
    setFilteredArticles(filtered);
  };

  const resetSearch = () => {
    setSearchTerm('');
    setCategory('');
    setRegion('');
    setDateFrom('');
    setSearching(false);
    setFilteredArticles([]);
    setCurrentPage(1);
  };

  // Get current articles for pagination
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = filteredArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);

  return (
    <div className="section-view">
      <h1>Search</h1>
      <div className="search-filters">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            handleSearch();
          }}
        >
          <option value="">All Regions</option>
          <option value="reuters.com/world">World</option>
          <option value="reuters.com/business">Business</option>
          <option value="reuters.com/markets">Markets</option>
          <option value="apnews.com">Associated Press</option>
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            handleSearch();
          }}
        >
          <option value="">All Topics</option>
          <option value="World">World</option>
          <option value="Financial">Financial</option>
          <option value="Events">Events</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            handleSearch();
          }}
          placeholder="From Date"
        />
      </div>
      <div className="section-articles">
        {searching ? (
          filteredArticles.length > 0 ? (
            <>
              <div className="articles-grid">
                {currentArticles.map(article => (
                  <div className="section-article-wrapper" key={article.id}>
                    <ArticleCard article={article} type="standard" />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-articles">No articles found matching your criteria.</div>
          )
        ) : (
          <div className="no-articles">Use the search filters above to find articles.</div>
        )}
      </div>
    </div>
  );
};

export default Search;
