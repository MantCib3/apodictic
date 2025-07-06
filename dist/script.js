const BASE_URL = 'https://www.apodictic.com';
const ARTICLES_PER_PAGE = 6;

// Utility to sanitize input
function sanitizeInput(input, isStructured = false) {
    if (!input || typeof input !== 'string') return '';
    if (isStructured) return input;
    const entityMap = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '',
        '/': '/'
    };
    return input
        .replace(/<\/?script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, '')
        .replace(/[&<>"'\/]/g, char => entityMap[char]);
}

// Debounce utility for search filters
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Fetch articles from DB.json
async function fetchArticles() {
    try {
        const response = await fetch('/DB.json');
        if (!response.ok) throw new Error('Failed to fetch DB.json');
        const data = await response.json();
        return data.articles || [];
    } catch (error) {
        console.error('Error fetching articles:', error);
        return [];
    }
}

// Render article content
function renderArticle(article) {
    const mainContent = document.getElementById('main-content');
    if (!article) {
        mainContent.innerHTML = '<div class="no-articles">No article found.</div>';
        return;
    }
    mainContent.classList.add('article-detail-view');
    mainContent.classList.remove('section-view');
    document.querySelector('.lower-sections').style.display = 'none';
    document.querySelector('.financial-section').style.display = 'none';

    mainContent.innerHTML = `
        <div class="article-detail">
            <h1>${sanitizeInput(article.title || 'Untitled Article')}</h1>
            <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
            <div class="article-image" style="background-image: url('${sanitizeInput(article.image || `${BASE_URL}/assets/logo.png`, true)}')"></div>
            <div class="dot-points">
                <ul>
                    ${article.dot_points?.length > 0 ? article.dot_points.map(point => `<li>${sanitizeInput(point)}</li>`).join('') : '<li>No key points available.</li>'}
                </ul>
            </div>
            <div class="content">${sanitizeInput(article.content || 'No content available.')}</div>
            ${article.quotes && article.quotes.length > 0 ? article.quotes.map(q => `
                <div class="quote">${sanitizeInput(q.text || 'No quote text available.')}</div>
                <div class="quote-source">${sanitizeInput(q.source || q.speaker || 'Unknown')}</div>
            `).join('') : ''}
            <div class="sources">
                <h3>Sources</h3>
                <ul>
                    ${article.sources?.length > 0 ? article.sources.map(s => `<li><a href="${sanitizeInput(s.url || '#', true)}" target="_blank">${sanitizeInput(s.title || 'Untitled Source')}</a></li>`).join('') : '<li>No sources available.</li>'}
                </ul>
            </div>
            <div class="share-button">
                <button onclick="navigator.share ? navigator.share({title: '${sanitizeInput(article.title || 'Article')}', url: window.location.href}) : alert('Sharing is not supported in this browser. Please copy the URL to share: ' + window.location.href)"><i class="fas fa-share"></i></button>
            </div>
        </div>
    `;
}

// Render paginated articles for sections
function renderPaginatedArticles(articles, currentPage) {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const paginatedArticles = articles.slice(start, end);
    let html = '';

    if (paginatedArticles.length > 0) {
        html = paginatedArticles.map(a => `
            <div class="section-article" data-article-id="${sanitizeInput(a.id || '', true)}">
                <div class="article-image-container" style="background-image: url('${sanitizeInput(a.image || `${BASE_URL}/assets/logo.png`, true)}')"></div>
                <div class="article-content">
                    <h3>${sanitizeInput(a.title || 'Untitled Article')}</h3>
                    <div class="date">${a.date ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(a.lead || a.content || 'No content available.')}</p>
                </div>
            </div>
        `).join('');
    } else {
        html = '<div class="no-articles">No articles found.</div>';
    }

    return html;
}

// Render pagination for sections
function renderPagination(totalArticles, currentPage, section) {
    const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
    return `
        <div class="pagination">
            <button class="prev-page" data-section="${sanitizeInput(section, true)}" data-current-page="${currentPage}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            ${Array.from({ length: totalPages }, (_, i) => `
                <button class="page-button ${currentPage === i + 1 ? 'active' : ''}" data-section="${sanitizeInput(section, true)}" data-page="${i + 1}">${i + 1}</button>
            `).join('')}
            <button class="next-page" data-section="${sanitizeInput(section, true)}" data-current-page="${currentPage}" data-total-pages="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;
}

// Filter articles for section view
async function filterSectionArticles(section) {
    const articles = await fetchArticles();
    const keyword = document.getElementById('keywordFilter')?.value.toLowerCase() || '';
    const region = document.getElementById('regionFilter')?.value.toLowerCase() || '';
    const topic = document.getElementById('topicFilter')?.value.toLowerCase() || '';
    const date = document.getElementById('dateFilter')?.value || '';

    let filteredArticles = articles;
    if (section !== 'latest' && section !== 'search') {
        filteredArticles = articles.filter(a => a.category?.toLowerCase() === section);
    }
    if (keyword) {
        filteredArticles = filteredArticles.filter(a => 
            a.title?.toLowerCase().includes(keyword) || 
            a.content?.toLowerCase().includes(keyword) || 
            a.lead?.toLowerCase().includes(keyword)
        );
    }
    if (region) {
        filteredArticles = filteredArticles.filter(a => a.region?.toLowerCase() === region);
    }
    if (topic && section === 'latest') {
        filteredArticles = filteredArticles.filter(a => a.category?.toLowerCase() === topic);
    }
    if (date) {
        filteredArticles = filteredArticles.filter(a => a.date?.startsWith(date));
    }

    const currentPage = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
    const sectionResults = document.getElementById('sectionResults');
    if (sectionResults) {
        sectionResults.innerHTML = renderPaginatedArticles(filteredArticles, currentPage);
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) {
            paginationContainer.outerHTML = renderPagination(filteredArticles.length, currentPage, section);
        }
    }
}

// Initialize page
async function init() {
    const path = window.location.pathname;
    const articles = await fetchArticles();

    // Handle article page
    const articleMatch = path.match(/^\/article\/([^/]+)/);
    if (articleMatch) {
        const articleId = articleMatch[1];
        const article = articles.find(a => a.id === articleId);
        renderArticle(article);
        return;
    }

    // Handle section pages
    const sectionMatch = path.match(/^\/section\/([^/]+)/);
    if (sectionMatch) {
        const section = sectionMatch[1];
        const currentPage = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
        let articlesToShow = section === 'latest' ? articles : articles.filter(a => a.category?.toLowerCase() === section);
        if (section === 'search') {
            articlesToShow = [];
        }
        const mainContent = document.getElementById('main-content');
        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';
        mainContent.innerHTML = `
            <div class="section-view">
                <h1>${sanitizeInput(section.charAt(0).toUpperCase() + section.slice(1), true)}</h1>
                <div class="search-filters">
                    <input type="text" id="keywordFilter" placeholder="Search..." oninput="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
                    <select id="regionFilter" onchange="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
                        <option value="">All Regions</option>
                        <option value="north-america">North America</option>
                        <option value="europe">Europe</option>
                        <option value="asia">Asia</option>
                        <option value="africa">Africa</option>
                        <option value="south-america">South America</option>
                        <option value="australia">Australia</option>
                    </select>
                    ${section === 'latest' ? `
                    <select id="topicFilter" onchange="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
                        <option value="">All Topics</option>
                        <option value="world">World</option>
                        <option value="events">Events</option>
                        <option value="financial">Finance</option>
                    </select>` : ''}
                    <input type="date" id="dateFilter" onchange="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
                </div>
                <div class="section-articles" id="sectionResults">
                    ${section === 'search' ? '<div class="no-articles">Enter search filters to view results.</div>' : renderPaginatedArticles(articlesToShow, currentPage)}
                </div>
                ${section !== 'search' ? renderPagination(articlesToShow.length, currentPage, section) : ''}
            </div>
        `;
    }

    // Attach event listeners
    document.addEventListener('click', (e) => {
        const articleCard = e.target.closest('.section-article, .event, .finance-event, .feature-article, .related-article-card');
        if (articleCard) {
            const articleId = articleCard.getAttribute('data-article-id');
            if (articleId) {
                window.location.href = `/article/${articleId}`;
            }
        }

        const pageButton = e.target.closest('.page-button');
        if (pageButton) {
            const section = pageButton.getAttribute('data-section');
            const page = pageButton.getAttribute('data-page');
            window.location.href = `/section/${section}?page=${page}`;
        }

        const prevButton = e.target.closest('.prev-page');
        if (prevButton) {
            const section = prevButton.getAttribute('data-section');
            const currentPage = parseInt(prevButton.getAttribute('data-current-page'));
            if (currentPage > 1) {
                window.location.href = `/section/${section}?page=${currentPage - 1}`;
            }
        }

        const nextButton = e.target.closest('.next-page');
        if (nextButton) {
            const section = nextButton.getAttribute('data-section');
            const currentPage = parseInt(nextButton.getAttribute('data-current-page'));
            const totalPages = parseInt(nextButton.getAttribute('data-total-pages'));
            if (currentPage < totalPages) {
                window.location.href = `/section/${section}?page=${currentPage + 1}`;
            }
        }
    });
}

// Global debounce function for search filters
window.debounceFilterSectionArticles = debounce(filterSectionArticles, 300);

// Run initialization on DOM content loaded
document.addEventListener('DOMContentLoaded', init);