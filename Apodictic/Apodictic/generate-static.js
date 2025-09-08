const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

// Configuration
const OUTPUT_DIR = 'dist';
const BASE_URL = 'https://www.apodictic.com';
const DEFAULT_IMAGE = `${BASE_URL}/assets/logo.png`;
const DEFAULT_DESCRIPTION = 'Apodictic delivers the latest news and in-depth coverage on World, Events, and Finance.';
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

// Utility to update meta tags
function generateMetaTags({ title, description, url, image, type = 'website', keywords = 'news, world news, events, finance, breaking news, current affairs, Apodictic' }) {
    title = sanitizeInput(title || 'Apodictic - World, Events, Finance News');
    description = sanitizeInput(description || DEFAULT_DESCRIPTION);
    url = sanitizeInput(url || BASE_URL);
    image = sanitizeInput(image || DEFAULT_IMAGE);
    keywords = sanitizeInput(keywords);

    return `
        <title>${title}</title>
        <meta name="description" content="${description.substring(0, 160)}">
        <meta name="keywords" content="${keywords}">
        <meta name="author" content="Apodictic News Team">
        <meta name="robots" content="index, follow">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description.substring(0, 160)}">
        <meta property="og:url" content="${url}">
        <meta property="og:image" content="${image}">
        <meta property="og:type" content="${type}">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description.substring(0, 200)}">
        <meta name="twitter:image" content="${image}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:site" content="@ApodicticNews">
        <meta name="twitter:creator" content="@ApodicticNews">
        <link rel="canonical" href="${url}">
        <link rel="alternate" type="application/rss+xml" title="Apodictic News RSS Feed" href="${type === 'article' ? `${BASE_URL}/rss?article=${url.split('/').pop()}` : `${BASE_URL}/rss?section=${url.split('/').pop()}`}">
    `;
}

// Load index.html template and update CSS and JS links
async function loadTemplate() {
    let html;
    try {
        html = await fs.readFile('index.html', 'utf8');
    } catch (error) {
        throw new Error('Failed to load index.html: ' + error.message);
    }
    html = html.replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="/styles.css">');
    if (!html.includes('<script src="/script.js"></script>')) {
        html = html.replace('</body>', '<script src="/script.js"></script></body>');
    } else {
        html = html.replace('<script src="script.js">', '<script src="/script.js"></script>');
    }
    return html;
}

// Load articles from DB.json
async function loadArticles() {
    try {
        const data = await fs.readFile('DB.json', 'utf8');
        const articles = JSON.parse(data).articles || [];
        articles.forEach(a => {
            if (!a.id) throw new Error('Article missing id: ' + JSON.stringify(a));
        });
        return articles;
    } catch (error) {
        throw new Error('Failed to load DB.json: ' + error.message);
    }
}

// Create output directory
async function createOutputDir() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

// Copy static assets
async function copyAssets() {
    await fs.mkdir(path.join(OUTPUT_DIR, 'assets'), { recursive: true });
    await fs.copyFile('assets/logo.png', path.join(OUTPUT_DIR, 'assets/logo.png'));
    await fs.copyFile('styles.css', path.join(OUTPUT_DIR, 'styles.css'));
    await fs.copyFile('script.js', path.join(OUTPUT_DIR, 'script.js'));
    await fs.copyFile('DB.json', path.join(OUTPUT_DIR, 'DB.json'));
}

// Render paginated articles
function renderPaginatedArticles(articles, currentPage) {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const paginatedArticles = articles.slice(start, end);
    let html = '';

    if (paginatedArticles.length > 0) {
        html = paginatedArticles.map(a => `
            <div class="section-article" data-article-id="${sanitizeInput(a.id || '', true)}">
                <div class="article-image-container" style="background-image: url('${sanitizeInput(a.image || DEFAULT_IMAGE, true)}')"></div>
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

// Render pagination
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

// Generate home page
async function generateHomePage(dom, articles) {
    const window = dom.window;
    const document = window.document;

    const featureArticle = document.getElementById('feature-article');
    const firstArticle = articles[0];
    featureArticle.setAttribute('data-article-id', sanitizeInput(firstArticle.id || '', true));
    featureArticle.querySelector('.feature-image-container').style.backgroundImage = `url(${sanitizeInput(firstArticle.image || DEFAULT_IMAGE, true)})`;
    featureArticle.querySelector('.feature-text').innerHTML = `
        <h1>${sanitizeInput(firstArticle.title || 'Untitled Article')}</h1>
        <div class="date">${firstArticle.date ? new Date(firstArticle.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
        <p>${sanitizeInput(firstArticle.lead || firstArticle.content || 'No content available.')}</p>
    `;

    const latestSection = document.getElementById('latest-section');
    latestSection.innerHTML = '<h3>Latest</h3>';
    for (let i = 1; i < Math.min(4, articles.length); i++) {
        const article = articles[i];
        latestSection.innerHTML += `
            <div class="event" data-article-id="${sanitizeInput(article.id || '', true)}">
                <div class="event-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                <div class="event-content">
                    <h4>${sanitizeInput(article.title || 'Untitled Article')}</h4>
                    <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                </div>
            </div>
        `;
    }

    const worldSection = document.getElementById('world');
    const eventsSection = document.getElementById('events');
    worldSection.innerHTML = '<h2>World</h2>';
    eventsSection.innerHTML = '<h2>Events</h2>';

    let worldCount = 0;
    const eventArticles = articles.filter(a => a.category && a.category.toLowerCase() === 'events');
    articles.forEach(article => {
        if (article.category?.toLowerCase() === 'world' && worldCount < 2) {
            worldSection.innerHTML += `
                <div class="article" data-article-id="${sanitizeInput(article.id || '', true)}">
                    <div class="article-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                    <div class="article-content">
                        <h3>${sanitizeInput(article.title || 'Untitled Article')}</h3>
                        <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                        <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                    </div>
                </div>
            `;
            worldCount++;
        }
    });

    eventArticles.slice(0, 2).forEach(article => {
        eventsSection.innerHTML += `
            <div class="article" data-article-id="${sanitizeInput(article.id || '', true)}">
                <div class="article-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                <div class="article-content">
                    <h3>${sanitizeInput(article.title || 'Untitled Article')}</h3>
                    <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                </div>
            </div>
        `;
    });

    const financeFeatureArticle = document.getElementById('finance-feature-article');
    const financeLatestSection = document.getElementById('finance-latest-section');
    const financeArticles = articles.filter(a => a.category && a.category.toLowerCase() === 'financial');
    if (financeArticles.length > 0) {
        const financeFeature = financeArticles[0];
        financeFeatureArticle.setAttribute('data-article-id', sanitizeInput(financeFeature.id || '', true));
        financeFeatureArticle.querySelector('.finance-feature-image-container').style.backgroundImage = `url(${sanitizeInput(financeFeature.image || DEFAULT_IMAGE, true)})`;
        financeFeatureArticle.querySelector('.finance-feature-text').innerHTML = `
            <h1>${sanitizeInput(financeFeature.title || 'Untitled Article')}</h1>
            <div class="date">${financeFeature.date ? new Date(financeFeature.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
            <p>${sanitizeInput(financeFeature.lead || financeFeature.content || 'No content available.')}</p>
        `;
        financeLatestSection.innerHTML = '<h3>Latest</h3>';
        financeArticles.slice(1, 3).forEach(article => {
            financeLatestSection.innerHTML += `
                <div class="finance-event" data-article-id="${sanitizeInput(article.id || '', true)}">
                    <div class="finance-event-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                    <div class="finance-event-content">
                        <h4>${sanitizeInput(article.title || 'Untitled Article')}</h4>
                        <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                        <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                    </div>
                </div>
            `;
        });
    }

    document.head.innerHTML += generateMetaTags({
        title: 'Apodictic - World, Events, Finance News',
        description: DEFAULT_DESCRIPTION,
        url: BASE_URL,
        image: DEFAULT_IMAGE
    });

    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), dom.serialize());
}

// Generate section pages
async function generateSectionPage(dom, articles, section, currentPage = 1) {
    const window = dom.window;
    const document = window.document;
    let title, description, keywords, articlesToShow;

    if (section === 'latest') {
        title = 'Latest News - Apodictic';
        description = 'Stay updated with the latest breaking news and articles on World, Events, and Finance at Apodictic.';
        articlesToShow = articles.slice(0);
        keywords = 'latest news, breaking news, world, events, finance, Apodictic';
    } else if (section === 'world') {
        title = 'World News - Apodictic';
        description = 'Explore global news and in-depth coverage of world events at Apodictic.';
        articlesToShow = articles.filter(a => a.category?.toLowerCase() === 'world');
        keywords = 'world news, global events, international news, Apodictic';
    } else if (section === 'events') {
        title = 'Events - Apodictic';
        description = 'Discover upcoming and past events with detailed coverage at Apodictic.';
        articlesToShow = articles.filter(a => a.category?.toLowerCase() === 'events');
        keywords = 'events, global events, local events, Apodictic';
    } else if (section === 'financial') {
        title = 'Finance News - Apodictic';
        description = 'Get the latest financial news, market updates, and economic insights at Apodictic.';
        articlesToShow = articles.filter(a => a.category?.toLowerCase() === 'financial');
        keywords = 'finance news, markets, economy, Apodictic';
    } else if (section === 'search') {
        title = 'Search - Apodictic News';
        description = 'Search for the latest news on World, Events, and Finance at Apodictic.';
        articlesToShow = [];
        keywords = 'search news, world news, events, finance, Apodictic';
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

    document.head.innerHTML += generateMetaTags({
        title,
        description,
        url: `${BASE_URL}/section/${sanitizeInput(section, true)}`,
        image: articlesToShow[0]?.image || DEFAULT_IMAGE,
        keywords
    });

    await fs.mkdir(path.join(OUTPUT_DIR, 'section', section), { recursive: true });
    await fs.writeFile(path.join(OUTPUT_DIR, 'section', section, `index.html`), dom.serialize());
}

// Generate article pages
async function generateArticlePage(dom, article, articles) {
    const window = dom.window;
    const document = window.document;

    // Validate article
    if (!article || !article.id) {
        throw new Error('Invalid article or missing ID: ' + JSON.stringify(article));
    }

    // Validate main-content element
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        throw new Error('main-content element not found in template for article: ' + article.id);
    }
    mainContent.classList.add('article-detail-view');
    mainContent.classList.remove('section-view');

    // Hide lower sections
    const lowerSections = document.querySelector('.lower-sections');
    if (lowerSections) {
        lowerSections.style.display = 'none';
    } else {
        console.warn('lower-sections element not found in template for article: ' + article.id);
    }
    const financialSection = document.querySelector('.financial-section');
    if (financialSection) {
        financialSection.style.display = 'none';
    } else {
        console.warn('financial-section element not found in template for article: ' + article.id);
    }

    // Generate related articles with validation
    const relatedArticles = articles
        .filter(a => a.id && a.id !== article.id && a.category?.toLowerCase() === article.category?.toLowerCase() && a.region?.toLowerCase() === article.region?.toLowerCase())
        .slice(0, 3);
    const topicOnlyArticle = articles
        .filter(a => a.id && a.id !== article.id && a.category?.toLowerCase() === article.category?.toLowerCase() && !relatedArticles.includes(a))
        .slice(0, 1);
    const allRelatedArticles = [...relatedArticles, ...topicOnlyArticle];

    // Set article content with explicit clickable elements
    mainContent.innerHTML = `
        <div class="article-detail" data-article-id="${sanitizeInput(article.id, true)}">
            <h1>${sanitizeInput(article.title || 'Untitled Article')}</h1>
            <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
            <div class="article-image" style="background-image: url('${sanitizeInput(article.image || DEFAULT_IMAGE, true)}')"></div>
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
                <button class="share-btn" type="button" data-share-url="${sanitizeInput(`${BASE_URL}/article/${article.id}`, true)}" data-share-title="${sanitizeInput(article.title || 'Article')}">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        </div>
        <div class="related-articles">
            <h2 class="related-articles-title">Related Articles</h2>
            <div class="related-articles-container">
                ${allRelatedArticles.length > 0 ? allRelatedArticles.map(a => `
                    <a href="/article/${sanitizeInput(a.id, true)}" class="related-article-card" data-article-id="${sanitizeInput(a.id, true)}">
                        <div class="related-article-image" style="background-image: url('${sanitizeInput(a.image || DEFAULT_IMAGE, true)}')"></div>
                        <div class="related-article-text">
                            <h3 class="related-article-title">${sanitizeInput(a.title || 'Untitled Article')}</h3>
                            <div class="related-article-date">${a.date ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                            <p class="related-article-lead">${sanitizeInput(a.lead || a.content || 'No content available.')}</p>
                        </div>
                    </a>
                `).join('') : '<div class="no-related-articles">No related articles found.</div>'}
            </div>
        </div>
    `;

    // Verify interactive elements
    const shareButton = document.querySelector('.share-btn');
    if (!shareButton) {
        console.warn(`Share button not found in article page for ID ${article.id}`);
    }
    const relatedCards = document.querySelectorAll('.related-article-card');
    if (relatedCards.length === 0 && allRelatedArticles.length > 0) {
        console.warn(`Related article cards not generated for article ID ${article.id}`);
    }

    // Add meta tags
    const articleKeywords = [
        sanitizeInput(article.category?.toLowerCase() || 'news', true),
        sanitizeInput(article.region?.toLowerCase() || 'global', true),
        'Apodictic',
        ...(article.title ? article.title.split(' ').slice(0, 3).map(s => sanitizeInput(s)) : [])
    ].filter(Boolean).join(', ');
    document.head.innerHTML += generateMetaTags({
        title: `${sanitizeInput(article.title || 'Article')} - Apodictic`,
        description: sanitizeInput((article.lead || article.content || DEFAULT_DESCRIPTION).substring(0, 160)),
        url: `${BASE_URL}/article/${sanitizeInput(article.id, true)}`,
        image: sanitizeInput(article.image || DEFAULT_IMAGE, true),
        type: 'article',
        keywords: articleKeywords
    });

    // Save article page
    try {
        await fs.mkdir(path.join(OUTPUT_DIR, 'article', article.id), { recursive: true });
        await fs.writeFile(path.join(OUTPUT_DIR, 'article', article.id, 'index.html'), dom.serialize());
    } catch (error) {
        throw new Error(`Failed to save article page for ID ${article.id}: ${error.message}`);
    }
}

// Generate static pages (about, contact, privacy)
async function generateStaticPage(dom, page) {
    const window = dom.window;
    const document = window.document;
    let title, description, url, keywords, content;

    if (page === 'about') {
        title = 'About Us - Apodictic';
        description = 'Learn about Apodictic, your trusted source for reliable news on World, Events, and Finance since 2025.';
        url = `${BASE_URL}/about`;
        keywords = 'about us, Apodictic, news, journalism';
        content = `
            <h1>About Us</h1>
            <div class="article-detail">
                <p>Welcome to our News Website, your trusted source for reliable and timely news coverage since 2025. Our mission is to deliver accurate, insightful, and engaging content that keeps you informed about the world around you.</p>
                <p>We are a team of dedicated journalists and editors committed to upholding the highest standards of journalism. Our coverage spans global events, finance, and more, ensuring you have access to diverse perspectives and in-depth analysis.</p>
                <p>Thank you for choosing us as your news provider. We strive to empower our readers with knowledge and foster a well-informed community.</p>
            </div>
        `;
    } else if (page === 'contact') {
        title = 'Contact Us - Apodictic';
        description = 'Get in touch with Apodictic for feedback, inquiries, or to stay updated via social media.';
        url = `${BASE_URL}/contact`;
        keywords = 'contact, Apodictic, news, feedback';
        content = `
            <h1>Contact Us</h1>
            <div class="article-detail">
                <p>We value your feedback and are here to assist you. Reach out to us through the following channels:</p>
                <ul class="dot-points">
                    <li><strong>Email:</strong> <a href="mailto:contact@newswebsite.com">contact@newswebsite.com</a></li>
                    <li><strong>Phone:</strong> +1 (555) 123-4567</li>
                    <li><strong>Address:</strong> 123 News Street, Information City, IN 12345</li>
                </ul>
                <p>Follow us on social media for the latest updates:</p>
                <ul class="dot-points">
                    <li><a href="https://twitter.com/newswebsite" target="_blank">Twitter</a></li>
                    <li><a href="https://facebook.com/newswebsite" target="_blank">Facebook</a></li>
                    <li><a href="https://linkedin.com/company/newswebsite" target="_blank">LinkedIn</a></li>
                </ul>
            </div>
        `;
    } else if (page === 'privacy') {
        title = 'Privacy Policy - Apodictic';
        description = 'Read Apodictic\'s Privacy Policy to understand how we handle your data and protect your privacy.';
        url = `${BASE_URL}/privacy`;
        keywords = 'privacy policy, Apodictic, data protection, news';
        content = `
            <h1>Privacy Policy</h1>
            <div class="article-detail">
                <p>At Apodictic, we are committed to protecting your privacy. This Privacy Policy outlines how we collect, use, and safeguard your data.</p>
                <p>We collect minimal personal information, such as cookies for analytics, to improve your experience. We do not share your data with third parties without consent.</p>
                <p>For more details, contact us at <a href="mailto:privacy@newswebsite.com">privacy@newswebsite.com</a>.</p>
            </div>
        `;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.classList.add('section-view');
    mainContent.classList.remove('article-detail-view');
    document.querySelector('.lower-sections').style.display = 'none';
    document.querySelector('.financial-section').style.display = 'none';
    mainContent.innerHTML = `<div class="section-view">${content}</div>`;

    document.head.innerHTML += generateMetaTags({
        title,
        description,
        url,
        image: DEFAULT_IMAGE,
        keywords
    });

    await fs.mkdir(path.join(OUTPUT_DIR, page), { recursive: true });
    await fs.writeFile(path.join(OUTPUT_DIR, page, 'index.html'), dom.serialize());
}

// Main function to generate static site
async function generateStaticSite() {
    try {
        await createOutputDir();
        await copyAssets();
        const template = await loadTemplate();
        const articles = await loadArticles();

        // Generate home page
        let dom = new JSDOM(template);
        await generateHomePage(dom, articles);

        // Generate section pages
        for (const section of ['latest', 'world', 'events', 'financial', 'search']) {
            const totalArticles = section === 'latest' ? articles.length : articles.filter(a => a.category?.toLowerCase() === section).length;
            const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
            for (let page = 1; page <= (section === 'search' ? 1 : totalPages); page++) {
                dom = new JSDOM(template);
                await generateSectionPage(dom, articles, section, page);
            }
        }

        // Generate article pages
        for (const article of articles) {
            dom = new JSDOM(template);
            await generateArticlePage(dom, article, articles);
        }

        // Generate static pages
        for (const page of ['about', 'contact', 'privacy']) {
            dom = new JSDOM(template);
            await generateStaticPage(dom, page);
        }

        console.log('Static site generated successfully in', OUTPUT_DIR);
    } catch (error) {
        console.error('Error generating static site:', error);
    }
}

generateStaticSite();