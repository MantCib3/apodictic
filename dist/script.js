let articlesData = [];
let debounceTimeout = null;
let filterTimeout = null;
window.indexedArticles = { byCategory: {}, byRegion: {}, byDate: {} };
const ARTICLES_PER_PAGE = 6;
const BASE_URL = 'https://www.apodictic.com';
const DEFAULT_IMAGE = `${BASE_URL}/assets/logo.png`;
const DEFAULT_DESCRIPTION = 'Apodictic delivers the latest news and in-depth coverage on World, Events, and Finance.';

// Function to sanitize user input to prevent XSS and XML injection
function sanitizeInput(input, isStructured = false) {
    if (!input || typeof input !== 'string') return '';
    if (isStructured) return input; // Skip sanitization for predefined or structured inputs like select options or dates
    // Replace potentially dangerous characters with their HTML entities for free-text inputs
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };
    // Remove script tags and event handlers, and escape special characters
    return input
        .replace(/<\/?script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, '')
        .replace(/[&<>"'\/]/g, char => entityMap[char]);
}

function updateMetaTags({ title, description, url, image, type = 'website', keywords = 'news, world news, events, finance, breaking news, current affairs, Apodictic' }) {
    try {
        // Sanitize inputs to prevent XSS in meta tags
        title = sanitizeInput(title || 'Apodictic - World, Events, Finance News');
        description = sanitizeInput(description || DEFAULT_DESCRIPTION);
        url = sanitizeInput(url || BASE_URL);
        image = sanitizeInput(image || DEFAULT_IMAGE);
        keywords = sanitizeInput(keywords);

        // Update document title
        document.title = title;

        // Define meta tags with safe defaults
        const metaTags = [
            { name: 'description', content: description.substring(0, 160) },
            { name: 'keywords', content: keywords },
            { name: 'author', content: 'Apodictic News Team' },
            { name: 'robots', content: 'index, follow' },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description.substring(0, 160) },
            { property: 'og:url', content: url },
            { property: 'og:image', content: image },
            { property: 'og:type', content: type },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description.substring(0, 200) },
            { name: 'twitter:image', content: image },
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:site', content: '@ApodicticNews' },
            { name: 'twitter:creator', content: '@ApodicticNews' }
        ];

        // Update or create meta tags
        metaTags.forEach(tag => {
            let element = tag.name 
                ? document.querySelector(`meta[name="${tag.name}"]`)
                : document.querySelector(`meta[property="${tag.property}"]`);
            if (!element) {
                element = document.createElement('meta');
                if (tag.name) element.setAttribute('name', tag.name);
                if (tag.property) element.setAttribute('property', tag.property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', tag.content);
        });

        // Update canonical link
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', url);

        // Update alternate RSS link
        let alternate = document.querySelector('link[rel="alternate"][type="application/rss+xml"]');
        if (!alternate) {
            alternate = document.createElement('link');
            alternate.setAttribute('rel', 'alternate');
            alternate.setAttribute('type', 'application/rss+xml');
            alternate.setAttribute('title', 'Apodictic News RSS Feed');
            document.head.appendChild(alternate);
        }
        alternate.setAttribute('href', type === 'article' ? `${BASE_URL}/rss?article=${url.split('/').pop()}` : `${BASE_URL}/rss?section=${url.split('/').pop()}`);
    } catch (error) {
        console.error('Error updating meta tags:', error);
    }
}

function debounceAttachArticleEventListeners() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(attachArticleEventListeners, 100);
}

function debounceFilterSectionArticles(section) {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => filterSectionArticles(section), 300);
}

function debounceSearchArticles() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(searchArticles, 300);
}

function preprocessArticles(data) {
    try {
        const indexedData = {
            byCategory: {},
            byRegion: {},
            byDate: {}
        };
        data.forEach(article => {
            const category = sanitizeInput(article.category?.toLowerCase() || 'unknown', true);
            const region = sanitizeInput(article.region?.toLowerCase() || 'unknown', true);
            const date = article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown';
            if (!indexedData.byCategory[category]) indexedData.byCategory[category] = [];
            indexedData.byCategory[category].push(article);
            if (!indexedData.byRegion[region]) indexedData.byRegion[region] = [];
            indexedData.byRegion[region].push(article);
            if (!indexedData.byDate[date]) indexedData.byDate[date] = [];
            indexedData.byDate[date].push(article);
        });
        return indexedData;
    } catch (error) {
        console.error('Error preprocessing articles:', error);
        return { byCategory: {}, byRegion: {}, byDate: {} };
    }
}

function attachArticleEventListeners() {
    document.removeEventListener('click', handleClickDelegation);
    document.addEventListener('click', handleClickDelegation);

    function handleClickDelegation(event) {
        try {
            const articleElement = event.target.closest('[data-article-id]');
            if (articleElement) {
                event.preventDefault();
                const articleId = sanitizeInput(articleElement.getAttribute('data-article-id'), true);
                console.log('Clicked article ID:', articleId);
                showArticleDetail(articleId);
                return;
            }

            const sectionArrow = event.target.closest('.section-arrow');
            if (sectionArrow) {
                event.preventDefault();
                const parentSection = sectionArrow.closest('section, aside');
                let sectionId = '';
                if (parentSection.id === 'world') sectionId = 'world';
                else if (parentSection.id === 'events') sectionId = 'events';
                else if (parentSection.id === 'latest-section') sectionId = 'latest';
                else if (parentSection.id === 'financial' || parentSection.id === 'finance-latest-section') sectionId = 'financial';
                console.log('Clicked section arrow for:', sectionId);
                if (sectionId) showSectionView(sectionId);
                return;
            }

            const footerLink = event.target.closest('.footer-link');
            if (footerLink) {
                event.preventDefault();
                const page = sanitizeInput(footerLink.getAttribute('data-page'), true);
                console.log('Clicked footer link:', page);
                if (page === 'about') showAboutUsView();
                else if (page === 'contact') showContactUsView();
                else if (page === 'privacy') showPrivacyPolicyView();
                return;
            }

            const navLink = event.target.closest('nav ul li a');
            if (navLink) {
                event.preventDefault();
                const href = sanitizeInput(navLink.getAttribute('href'), true);
                const onclick = navLink.getAttribute('onclick') || '';
                if (onclick.includes('restoreMainContent')) restoreMainContent();
                else if (onclick.includes('showSectionView')) {
                    const sectionId = sanitizeInput(onclick.match(/'([^']+)'/)[1], true);
                    showSectionView(sectionId);
                } else if (onclick.includes('showSearchView')) showSearchView();
            }

            const pageButton = event.target.closest('.page-button');
            if (pageButton) {
                event.preventDefault();
                const page = parseInt(pageButton.getAttribute('data-page'));
                const section = sanitizeInput(pageButton.getAttribute('data-section'), true);
                console.log('Clicked page button:', page, 'for section:', section);
                if (section === 'search') {
                    searchArticles(page);
                } else {
                    filterSectionArticles(section, page);
                }
            }

            const prevButton = event.target.closest('.prev-page');
            if (prevButton) {
                event.preventDefault();
                const section = sanitizeInput(prevButton.getAttribute('data-section'), true);
                const currentPage = parseInt(prevButton.getAttribute('data-current-page')) || 1;
                const newPage = currentPage - 1;
                if (newPage >= 1) {
                    console.log('Clicked previous page for:', section, 'new page:', newPage);
                    if (section === 'search') {
                        searchArticles(newPage);
                    } else {
                        filterSectionArticles(section, newPage);
                    }
                }
            }

            const nextButton = event.target.closest('.next-page');
            if (nextButton) {
                event.preventDefault();
                const section = sanitizeInput(nextButton.getAttribute('data-section'), true);
                const currentPage = parseInt(nextButton.getAttribute('data-current-page')) || 1;
                const totalPages = parseInt(nextButton.getAttribute('data-total-pages')) || 1;
                const newPage = currentPage + 1;
                if (newPage <= totalPages) {
                    console.log('Clicked next page for:', section, 'new page:', newPage);
                    if (section === 'search') {
                        searchArticles(newPage);
                    } else {
                        filterSectionArticles(section, newPage);
                    }
                }
            }

            const subscribeButton = event.target.closest('.subscribe');
            if (subscribeButton) {
                event.preventDefault();
                subscribeNewsletter();
            }
        } catch (error) {
            console.error('Error in click delegation:', error);
        }
    }
}

function renderPaginatedArticles(articles, container, currentPage) {
    try {
        const fragment = document.createDocumentFragment();
        const start = (currentPage - 1) * ARTICLES_PER_PAGE;
        const end = start + ARTICLES_PER_PAGE;
        const paginatedArticles = articles.slice(start, end);

        if (paginatedArticles.length > 0) {
            paginatedArticles.forEach(a => {
                const articleDiv = document.createElement('div');
                articleDiv.className = 'section-article';
                articleDiv.setAttribute('data-article-id', sanitizeInput(a.id || '', true));
                articleDiv.innerHTML = `
                    <div class="article-image-container" style="background-image: url('${sanitizeInput(a.image || DEFAULT_IMAGE, true)}')"></div>
                    <div class="article-content">
                        <h3>${sanitizeInput(a.title || 'Untitled Article')}</h3>
                        <div class="date">${a.date ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                        <p>${sanitizeInput(a.lead || a.content || 'No content available.')}</p>
                    </div>
                `;
                fragment.appendChild(articleDiv);
            });
        } else {
            const noArticles = document.createElement('div');
            noArticles.className = 'no-articles';
            noArticles.textContent = 'No articles found.';
            fragment.appendChild(noArticles);
        }

        container.innerHTML = '';
        container.appendChild(fragment);
    } catch (error) {
        console.error('Error rendering paginated articles:', error);
        container.innerHTML = '<div class="no-articles">Error loading articles.</div>';
    }
}

function renderPagination(totalArticles, currentPage, section, container) {
    try {
        const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        paginationDiv.innerHTML = `
            <button class="prev-page" data-section="${sanitizeInput(section, true)}" data-current-page="${currentPage}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            ${Array.from({ length: totalPages }, (_, i) => `
                <button class="page-button ${currentPage === i + 1 ? 'active' : ''}" data-section="${sanitizeInput(section, true)}" data-page="${i + 1}">${i + 1}</button>
            `).join('')}
            <button class="next-page" data-section="${sanitizeInput(section, true)}" data-current-page="${currentPage}" data-total-pages="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        `;
        container.appendChild(paginationDiv);
    } catch (error) {
        console.error('Error rendering pagination:', error);
    }
}

function showSearchView(currentPage = 1) {
    try {
        console.log('Opening search view');
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const sectionView = document.createElement('div');
        sectionView.className = 'section-view';

        const h1 = document.createElement('h1');
        h1.textContent = 'Search';
        sectionView.appendChild(h1);

        const searchFilters = document.createElement('div');
        searchFilters.className = 'search-filters';
        searchFilters.innerHTML = `
            <input type="text" id="keywordFilter" placeholder="Search..." oninput="debounceSearchArticles()">
            <select id="regionFilter" onchange="debounceSearchArticles()">
                <option value="">All Regions</option>
                <option value="north-america">North America</option>
                <option value="europe">Europe</option>
                <option value="asia">Asia</option>
                <option value="africa">Africa</option>
                <option value="south-america">South America</option>
                <option value="australia">Australia</option>
            </select>
            <select id="topicFilter" onchange="debounceSearchArticles()">
                <option value="">All Topics</option>
                <option value="world">World</option>
                <option value="events">Events</option>
                <option value="financial">Finance</option>
            </select>
            <input type="date" id="dateFilter" onchange="debounceSearchArticles()">
        `;
        sectionView.appendChild(searchFilters);

        const sectionArticles = document.createElement('div');
        sectionArticles.className = 'section-articles';
        sectionArticles.id = 'searchResults';
        const noArticles = document.createElement('div');
        noArticles.className = 'no-articles';
        noArticles.textContent = 'Enter search filters to view results.';
        sectionArticles.appendChild(noArticles);
        sectionView.appendChild(sectionArticles);

        fragment.appendChild(sectionView);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        updateMetaTags({
            title: 'Search - Apodictic News',
            description: 'Search for the latest news on World, Events, and Finance at Apodictic.',
            url: `${BASE_URL}/section/search`,
            image: DEFAULT_IMAGE,
            keywords: 'search news, world news, events, finance, Apodictic'
        });

        history.pushState({ view: 'search' }, '', '/section/search');
        debounceAttachArticleEventListeners();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showSearchView:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading search view.</div>';
    }
}

function searchArticles(currentPage = 1) {
    try {
        const keyword = sanitizeInput(document.getElementById('keywordFilter')?.value.toLowerCase() || '');
        const region = sanitizeInput(document.getElementById('regionFilter')?.value || '', true);
        const topic = sanitizeInput(document.getElementById('topicFilter')?.value || '', true);
        const date = sanitizeInput(document.getElementById('dateFilter')?.value || '', true);
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) throw new Error('Search results element not found');

        let filteredArticles = articlesData;

        if (keyword) {
            filteredArticles = filteredArticles.filter(a => 
                (a.title?.toLowerCase().includes(keyword) || false) ||
                (a.content?.toLowerCase().includes(keyword) || false) ||
                (a.lead?.toLowerCase().includes(keyword) || false)
            );
        }

        if (region) {
            filteredArticles = filteredArticles.filter(a => a.region?.toLowerCase() === region.toLowerCase());
        }

        if (topic) {
            filteredArticles = filteredArticles.filter(a => a.category?.toLowerCase() === topic.toLowerCase());
        }

        if (date) {
            const selectedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            filteredArticles = filteredArticles.filter(a => 
                a.date && new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) === selectedDate);
        }

        // Update meta tags for filtered search results
        const keywordStr = keyword ? `including ${keyword}` : '';
        const regionStr = region ? `in ${region}` : '';
        const topicStr = topic ? `${topic} news` : 'news';
        const dateStr = date ? `from ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
        updateMetaTags({
            title: `Search Results - Apodictic News`,
            description: `Search results for ${topicStr} ${keywordStr} ${regionStr} ${dateStr} at Apodictic.`,
            url: `${BASE_URL}/section/search${keyword || region || topic || date ? `?q=${encodeURIComponent(keyword)}®ion=${encodeURIComponent(region)}&topic=${encodeURIComponent(topic)}&date=${encodeURIComponent(date)}` : ''}`,
            image: DEFAULT_IMAGE,
            keywords: `${keyword ? keyword + ', ' : ''}${region ? region + ', ' : ''}${topic ? topic + ', ' : ''}search news, Apodictic`
        });

        renderPaginatedArticles(filteredArticles, searchResults, currentPage);
        renderPagination(filteredArticles.length, currentPage, 'search', searchResults);
        debounceAttachArticleEventListeners();
    } catch (error) {
        console.error('Error in searchArticles:', error);
        document.getElementById('searchResults').innerHTML = '<div class="no-articles">Error loading search results.</div>';
    }
}

function showSectionView(section, currentPage = 1) {
    try {
        console.log(`Opening section: ${section}`);
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        let articlesToShow = [];
        let title = '';
        let description = '';
        let keywords = 'news, world news, events, finance, breaking news, current affairs, Apodictic';
        let showTopicFilter = true;

        if (section === 'latest') {
            title = 'Latest News - Apodictic';
            description = 'Stay updated with the latest breaking news and articles on World, Events, and Finance at Apodictic.';
            articlesToShow = articlesData.slice(0);
            showTopicFilter = true;
            keywords = 'latest news, breaking news, world, events, finance, Apodictic';
        } else if (section === 'world') {
            title = 'World News - Apodictic';
            description = 'Explore global news and in-depth coverage of world events at Apodictic.';
            articlesToShow = window.indexedArticles.byCategory['world'] || [];
            showTopicFilter = false;
            keywords = 'world news, global events, international news, Apodictic';
        } else if (section === 'events') {
            title = 'Events - Apodictic';
            description = 'Discover upcoming and past events with detailed coverage at Apodictic.';
            articlesToShow = window.indexedArticles.byCategory['events'] || [];
            showTopicFilter = false;
            keywords = 'events, global events, local events, Apodictic';
        } else if (section === 'financial') {
            title = 'Finance News - Apodictic';
            description = 'Get the latest financial news, market updates, and economic insights at Apodictic.';
            articlesToShow = window.indexedArticles.byCategory['financial'] || [];
            showTopicFilter = false;
            keywords = 'finance news, markets, economy, Apodictic';
        } else {
            throw new Error(`Invalid section: ${section}`);
        }

        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const sectionView = document.createElement('div');
        sectionView.className = 'section-view';

        const h1 = document.createElement('h1');
        h1.textContent = sanitizeInput(section.charAt(0).toUpperCase() + section.slice(1), true);
        sectionView.appendChild(h1);

        const searchFilters = document.createElement('div');
        searchFilters.className = 'search-filters';
        searchFilters.innerHTML = `
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
            ${showTopicFilter ? `
            <select id="topicFilter" onchange="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
                <option value="">All Topics</option>
                <option value="world">World</option>
                <option value="events">Events</option>
                <option value="financial">Finance</option>
            </select>` : ''}
            <input type="date" id="dateFilter" onchange="debounceFilterSectionArticles('${sanitizeInput(section, true)}')">
        `;
        sectionView.appendChild(searchFilters);

        const sectionArticles = document.createElement('div');
        sectionArticles.className = 'section-articles';
        sectionArticles.id = 'sectionResults';
        sectionView.appendChild(sectionArticles);

        fragment.appendChild(sectionView);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        updateMetaTags({
            title: title,
            description: description,
            url: `${BASE_URL}/section/${sanitizeInput(section, true)}`,
            image: DEFAULT_IMAGE,
            keywords: keywords
        });

        const keywordFilter = document.getElementById('keywordFilter');
        const regionFilter = document.getElementById('regionFilter');
        const topicFilter = document.getElementById('topicFilter');
        const dateFilter = document.getElementById('dateFilter');
        if (keywordFilter && window.currentKeyword) keywordFilter.value = sanitizeInput(window.currentKeyword);
        if (regionFilter && window.currentRegion) regionFilter.value = sanitizeInput(window.currentRegion, true);
        if (topicFilter && window.currentTopic) topicFilter.value = sanitizeInput(window.currentTopic, true);
        if (dateFilter && window.currentDate) dateFilter.value = sanitizeInput(window.currentDate, true);

        renderPaginatedArticles(articlesToShow, sectionArticles, currentPage);
        renderPagination(articlesToShow.length, currentPage, section, sectionArticles);

        history.pushState({ view: 'section', sectionId: section }, '', `/section/${sanitizeInput(section, true)}`);
        debounceAttachArticleEventListeners();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showSectionView:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading section.</div>';
    }
}

function filterSectionArticles(section, currentPage = 1) {
    try {
        if (!['world', 'events', 'financial', 'latest'].includes(section)) {
            console.error(`Invalid section: ${section}`);
            return;
        }

        const keyword = sanitizeInput(document.getElementById('keywordFilter')?.value.toLowerCase() || '');
        const region = sanitizeInput(document.getElementById('regionFilter')?.value || '', true);
        const topic = sanitizeInput(document.getElementById('topicFilter')?.value || '', true);
        const date = sanitizeInput(document.getElementById('dateFilter')?.value || '', true);
        const sectionResults = document.getElementById('sectionResults');
        if (!sectionResults) throw new Error('Section results element not found');

        window.currentKeyword = keyword;
        window.currentRegion = region;
        window.currentTopic = topic;
        window.currentDate = date;

        let filteredArticles = section === 'latest' ? articlesData.slice(0) : articlesData.filter(a => a.category?.toLowerCase() === section);

        if (keyword) {
            filteredArticles = filteredArticles.filter(a => 
                (a.title?.toLowerCase().includes(keyword) || false) ||
                (a.content?.toLowerCase().includes(keyword) || false) ||
                (a.lead?.toLowerCase().includes(keyword) || false)
            );
        }

        if (region) {
            filteredArticles = filteredArticles.filter(a => a.region?.toLowerCase() === region.toLowerCase());
        }

        if (topic && section === 'latest') {
            filteredArticles = filteredArticles.filter(a => a.category?.toLowerCase() === topic.toLowerCase());
        }

        if (date) {
            const selectedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            filteredArticles = filteredArticles.filter(a => 
                a.date && new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) === selectedDate);
        }

        // Update meta tags for filtered section results
        const keywordStr = keyword ? `including ${keyword}` : '';
        const regionStr = region ? `in ${region}` : '';
        const topicStr = topic && section === 'latest' ? `${topic} news` : `${section} news`;
        const dateStr = date ? `from ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
        const sectionTitle = section === 'latest' ? 'Latest News' : section.charAt(0).toUpperCase() + section.slice(1);
        updateMetaTags({
            title: `${sectionTitle} - Apodictic News`,
            description: `Explore ${topicStr} ${keywordStr} ${regionStr} ${dateStr} at Apodictic.`,
            url: `${BASE_URL}/section/${sanitizeInput(section, true)}${keyword || region || topic || date ? `?q=${encodeURIComponent(keyword)}®ion=${encodeURIComponent(region)}&topic=${encodeURIComponent(topic)}&date=${encodeURIComponent(date)}` : ''}`,
            image: filteredArticles[0]?.image || DEFAULT_IMAGE,
            keywords: `${keyword ? keyword + ', ' : ''}${region ? region + ', ' : ''}${topic && section === 'latest' ? topic + ', ' : ''}${section} news, Apodictic`
        });

        renderPaginatedArticles(filteredArticles, sectionResults, currentPage);
        renderPagination(filteredArticles.length, currentPage, section, sectionResults);
        debounceAttachArticleEventListeners();
    } catch (error) {
        console.error('Error in filterSectionArticles:', error);
        document.getElementById('sectionResults').innerHTML = '<div class="no-articles">Error loading articles.</div>';
    }
}

function subscribeNewsletter() {
    try {
        const emailInput = document.getElementById('emailInput');
        const nameInput = document.getElementById('nameInput');
        const email = sanitizeInput(emailInput?.value || '');
        const name = sanitizeInput(nameInput?.value || '');

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        console.log('Subscribing:', { name, email });
        // Placeholder for actual subscription logic (e.g., API call)
        alert(`Thank you, ${name || 'Subscriber'}! You've been subscribed to our newsletter with email: ${email}`);
        emailInput.value = '';
        nameInput.value = '';
    } catch (error) {
        console.error('Error in subscribeNewsletter:', error);
        alert('Error subscribing to newsletter. Please try again.');
    }
}

function showAboutUsView() {
    try {
        console.log('Opening About Us view');
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const sectionView = document.createElement('div');
        sectionView.className = 'section-view';
        sectionView.innerHTML = `
            <h1>About Us</h1>
            <div class="article-detail">
                <p>Welcome to our News Website, your trusted source for reliable and timely news coverage since 2025. Our mission is to deliver accurate, insightful, and engaging content that keeps you informed about the world around you.</p>
                <p>We are a team of dedicated journalists and editors committed to upholding the highest standards of journalism. Our coverage spans global events, finance, and more, ensuring you have access to diverse perspectives and in-depth analysis.</p>
                <p>Thank you for choosing us as your news provider. We strive to empower our readers with knowledge and foster a well-informed community.</p>
            </div>
        `;
        fragment.appendChild(sectionView);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        updateMetaTags({
            title: 'About Us - Apodictic',
            description: 'Learn about Apodictic, your trusted source for reliable news on World, Events, and Finance since 2025.',
            url: `${BASE_URL}/about`,
            image: DEFAULT_IMAGE,
            keywords: 'about us, Apodictic, news, journalism'
        });

        history.pushState({ view: 'about' }, '', '/about');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showAboutUsView:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading About Us page.</div>';
    }
}

function showContactUsView() {
    try {
        console.log('Opening Contact Us view');
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const sectionView = document.createElement('div');
        sectionView.className = 'section-view';
        sectionView.innerHTML = `
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
        fragment.appendChild(sectionView);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        updateMetaTags({
            title: 'Contact Us - Apodictic',
            description: 'Get in touch with Apodictic for feedback, inquiries, or to stay updated via social media.',
            url: `${BASE_URL}/contact`,
            image: DEFAULT_IMAGE,
            keywords: 'contact, Apodictic, news, feedback'
        });

        history.pushState({ view: 'contact' }, '', '/contact');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showContactUsView:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading Contact Us page.</div>';
    }
}

function showPrivacyPolicyView() {
    try {
        console.log('Opening Privacy Policy view');
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        mainContent.classList.add('section-view');
        mainContent.classList.remove('article-detail-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const sectionView = document.createElement('div');
        sectionView.className = 'section-view';
        sectionView.innerHTML = `
            <h1>Privacy Policy</h1>
            <div class="article-detail">
                <p>Welcome to our News Website, your trusted source for reliable and timely news coverage since 2025. Our mission is to deliver accurate, insightful, and engaging content that keeps you informed about the world around you.</p>
                <p>We are a team of dedicated journalists and editors committed to upholding the highest standards of journalism. Our coverage spans global events, finance, and more, ensuring you have access to diverse perspectives and in-depth analysis.</p>
                <p>Thank you for choosing us as your news provider. We strive to empower our readers with knowledge and foster a well-informed community.</p>
            </div>
        `;
        fragment.appendChild(sectionView);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        updateMetaTags({
            title: 'Privacy Policy - Apodictic',
            description: 'Read Apodictic\'s Privacy Policy to understand how we handle your data and protect your privacy.',
            url: `${BASE_URL}/privacy`,
            image: DEFAULT_IMAGE,
            keywords: 'privacy policy, Apodictic, data protection, news'
        });

        history.pushState({ view: 'privacy' }, '', '/privacy');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showPrivacyPolicyView:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading Privacy Policy page.</div>';
    }
}

function populateArticles() {
    try {
        if (!articlesData.length) {
            console.error('No articles available to populate');
            const mainContent = document.getElementById('main-content');
            const financeFeatureArticle = document.getElementById('finance-feature-article');
            const financeLatestSection = document.getElementById('finance-latest-section');
            const eventsSection = document.getElementById('events');
            if (mainContent) mainContent.innerHTML = '<div class="no-articles">No articles available.</div>';
            if (financeFeatureArticle) financeFeatureArticle.innerHTML = '<div class="no-articles">No financial articles available.</div>';
            if (financeLatestSection) financeLatestSection.innerHTML = '<h3>Latest</h3><div class="no-articles">No financial articles available.</div>';
            if (eventsSection) eventsSection.innerHTML = '<h2>Events</h2><div class="no-articles">No event articles available.</div>';
            return;
        }

        const featureArticle = document.getElementById('feature-article');
        if (!featureArticle) throw new Error('Feature article element not found');
        const firstArticle = articlesData[0];
        featureArticle.setAttribute('data-article-id', sanitizeInput(firstArticle.id || '', true));
        const featureImage = featureArticle.querySelector('.feature-image-container');
        const featureText = featureArticle.querySelector('.feature-text');
        featureImage.style.backgroundImage = `url(${sanitizeInput(firstArticle.image || DEFAULT_IMAGE, true)})`;
        featureText.innerHTML = `
            <h1>${sanitizeInput(firstArticle.title || 'Untitled Article')}</h1>
            <div class="date">${firstArticle.date ? new Date(firstArticle.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
            <p>${sanitizeInput(firstArticle.lead || firstArticle.content || 'No content available.')}</p>
        `;

        const latestSection = document.getElementById('latest-section');
        if (!latestSection) throw new Error('Latest section element not found');
        latestSection.innerHTML = '<h3>Latest</h3>';
        for (let i = 1; i < Math.min(4, articlesData.length); i++) {
            const article = articlesData[i];
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event';
            eventDiv.setAttribute('data-article-id', sanitizeInput(article.id || '', true));
            eventDiv.innerHTML = `
                <div class="event-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                <div class="event-content">
                    <h4>${sanitizeInput(article.title || 'Untitled Article')}</h4>
                    <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                </div>
            `;
            latestSection.appendChild(eventDiv);
        }

        const worldSection = document.getElementById('world');
        const eventsSection = document.getElementById('events');
        if (!worldSection || !eventsSection) throw new Error('World or Events section element not found');
        worldSection.innerHTML = '<h2>World</h2>';
        eventsSection.innerHTML = '<h2>Events</h2>';

        let worldCount = 0;
        let eventsCount = 0;
        let worldHasArticles = false;
        let eventsHasArticles = false;

        // Filter event articles directly from articlesData to ensure case-insensitive matching
        const eventArticles = articlesData.filter(a => a.category && a.category.toLowerCase() === 'events') || [];
        console.log('Event articles found:', eventArticles.length); // Debug log to verify articles

        articlesData.forEach((article, index) => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'article';
            articleDiv.setAttribute('data-article-id', sanitizeInput(article.id || '', true));
            articleDiv.innerHTML = `
                <div class="article-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                <div class="article-content">
                    <h3>${sanitizeInput(article.title || 'Untitled Article')}</h3>
                    <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                </div>
            `;

            if (article.category?.toLowerCase() === 'world' && worldCount < 2) {
                worldSection.appendChild(articleDiv);
                worldCount++;
                worldHasArticles = true;
            }
        });

        if (eventArticles.length > 0) {
            for (let i = 0; i < Math.min(2, eventArticles.length); i++) {
                const article = eventArticles[i];
                const articleDiv = document.createElement('div');
                articleDiv.className = 'article';
                articleDiv.setAttribute('data-article-id', sanitizeInput(article.id || '', true));
                articleDiv.innerHTML = `
                    <div class="article-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                    <div class="article-content">
                        <h3>${sanitizeInput(article.title || 'Untitled Article')}</h3>
                        <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                        <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                    </div>
                `;
                eventsSection.appendChild(articleDiv);
                eventsCount++;
                eventsHasArticles = true;
            }
        } else {
            console.warn('No event articles found in data');
            eventsSection.innerHTML += '<div class="no-articles">No event articles available.</div>';
        }

        const financeFeatureArticle = document.getElementById('finance-feature-article');
        const financeLatestSection = document.getElementById('finance-latest-section');
        if (!financeFeatureArticle || !financeLatestSection) throw new Error('Finance section elements not found');
        financeLatestSection.innerHTML = '<h3>Latest</h3>';

        // Filter financial articles directly from articlesData to ensure case-insensitive matching
        const financeArticles = articlesData.filter(a => a.category && a.category.toLowerCase() === 'financial') || [];
        console.log('Finance articles found:', financeArticles.length); // Debug log to verify articles

        if (financeArticles.length > 0) {
            const financeFeature = financeArticles[0];
            financeFeatureArticle.setAttribute('data-article-id', sanitizeInput(financeFeature.id || '', true));
            const financeFeatureImage = financeFeatureArticle.querySelector('.finance-feature-image-container');
            const financeFeatureText = financeFeatureArticle.querySelector('.finance-feature-text');
            if (financeFeatureImage && financeFeatureText) {
                financeFeatureImage.style.backgroundImage = `url(${sanitizeInput(financeFeature.image || DEFAULT_IMAGE, true)})`;
                financeFeatureText.innerHTML = `
                    <h1>${sanitizeInput(financeFeature.title || 'Untitled Article')}</h1>
                    <div class="date">${financeFeature.date ? new Date(financeFeature.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                    <p>${sanitizeInput(financeFeature.lead || financeFeature.content || 'No content available.')}</p>
                `;
            } else {
                console.error('Finance feature elements not found');
                financeFeatureArticle.innerHTML = '<div class="no-articles">Error loading financial feature article.</div>';
            }

            for (let i = 1; i < Math.min(3, financeArticles.length); i++) {
                const article = financeArticles[i];
                const financeEventDiv = document.createElement('div');
                financeEventDiv.className = 'finance-event';
                financeEventDiv.setAttribute('data-article-id', sanitizeInput(article.id || '', true));
                financeEventDiv.innerHTML = `
                    <div class="finance-event-image-container" style="background-image: url(${sanitizeInput(article.image || DEFAULT_IMAGE, true)})"></div>
                    <div class="finance-event-content">
                        <h4>${sanitizeInput(article.title || 'Untitled Article')}</h4>
                        <div class="date">${article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                        <p>${sanitizeInput(article.lead || article.content || 'No content available.')}</p>
                    </div>
                `;
                financeLatestSection.appendChild(financeEventDiv);
            }
        } else {
            console.warn('No financial articles found in data');
            financeFeatureArticle.innerHTML = '<div class="no-articles">No financial articles available.</div>';
            financeLatestSection.innerHTML += '<div class="no-articles">No financial articles available.</div>';
        }

        if (worldHasArticles) {
            const noArticles = worldSection.querySelector('.no-articles');
            if (noArticles) noArticles.remove();
        }
        if (eventsHasArticles) {
            const noArticles = eventsSection.querySelector('.no-articles');
            if (noArticles) noArticles.remove();
        }

        debounceAttachArticleEventListeners();
    } catch (error) {
        console.error('Error in populateArticles:', error);
        const financeFeatureArticle = document.getElementById('finance-feature-article');
        const financeLatestSection = document.getElementById('finance-latest-section');
        const eventsSection = document.getElementById('events');
        if (financeFeatureArticle) financeFeatureArticle.innerHTML = '<div class="no-articles">Error loading financial articles.</div>';
        if (financeLatestSection) financeLatestSection.innerHTML = '<h3>Latest</h3><div class="no-articles">Error loading financial articles.</div>';
        if (eventsSection) eventsSection.innerHTML = '<h2>Events</h2><div class="no-articles">Error loading event articles.</div>';
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading articles.</div>';
    }
}

function restoreMainContent() {
    try {
        console.log('Restoring main content');
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');
        mainContent.classList.remove('article-detail-view', 'section-view');
        mainContent.innerHTML = `
            <div class="feature-article" id="feature-article">
                <div class="feature-image-container"></div>
                <div class="feature-text">
                    <h1>Loading...</h1>
                    <div class="date">Loading...</div>
                    <p>Loading...</p>
                </div>
            </div>
            <aside class="latest-section" id="latest-section">
                <h3>Latest</h3>
            </aside>
        `;
        document.querySelector('.lower-sections').style.display = 'flex';
        document.querySelector('.financial-section').style.display = 'block';

        updateMetaTags({
            title: 'Apodictic - World, Events, Finance News',
            description: DEFAULT_DESCRIPTION,
            url: BASE_URL,
            image: DEFAULT_IMAGE,
            keywords: 'news, world news, events, finance, breaking news, current affairs, Apodictic'
        });

        history.pushState({ view: 'home' }, '', '/');
        populateArticles();
    } catch (error) {
        console.error('Error in restoreMainContent:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading main content.</div>';
    }
}

function showArticleDetail(articleId) {
    try {
        console.log('Showing article with ID:', articleId);
        const article = articlesData.find(a => a.id === articleId);
        const mainContent = document.getElementById('main-content');
        if (!mainContent) throw new Error('Main content element not found');

        if (!article) {
            console.error('Article not found for ID:', articleId);
            mainContent.innerHTML = '<div class="no-articles">Article not found.</div>';
            document.querySelector('.lower-sections').style.display = 'none';
            document.querySelector('.financial-section').style.display = 'none';
            updateMetaTags({
                title: 'Article Not Found - Apodictic',
                description: 'The requested article could not be found on Apodictic.',
                url: `${BASE_URL}/article/${sanitizeInput(articleId, true)}`,
                image: DEFAULT_IMAGE,
                keywords: 'news, Apodictic'
            });
            history.pushState({ view: 'article', articleId: articleId }, '', `/article/${sanitizeInput(articleId, true)}`);
            return;
        }

        const relatedArticles = articlesData.filter(a => a.id !== articleId && a.category?.toLowerCase() === article.category?.toLowerCase() && a.region?.toLowerCase() === article.region?.toLowerCase()).slice(0, 3);
        const topicOnlyArticle = articlesData.filter(a => a.id !== articleId && a.category?.toLowerCase() === article.category?.toLowerCase() && (!relatedArticles.includes(a))).slice(0, 1);
        const allRelatedArticles = [...relatedArticles, ...topicOnlyArticle];

        mainContent.classList.add('article-detail-view');
        mainContent.classList.remove('section-view');
        document.querySelector('.lower-sections').style.display = 'none';
        document.querySelector('.financial-section').style.display = 'none';

        const fragment = document.createDocumentFragment();
        const articleDetail = document.createElement('div');
        articleDetail.className = 'article-detail';
        articleDetail.innerHTML = `
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
                <button onclick="navigator.share ? navigator.share({title: '${sanitizeInput(article.title || 'Article')}', url: window.location.href}) : alert('Sharing is not supported in this browser. Please copy the URL to share: ' + window.location.href)"><i class="fas fa-share"></i></button>
            </div>
        `;

        const relatedArticlesSection = document.createElement('div');
        relatedArticlesSection.className = 'related-articles';
        relatedArticlesSection.innerHTML = `
            <h2 class="related-articles-title">Related Articles</h2>
            <div class="related-articles-container">
                ${allRelatedArticles.length > 0 ? allRelatedArticles.map(a => `
                    <div class="related-article-card feature-article" data-article-id="${sanitizeInput(a.id || '', true)}">
                        <div class="related-article-image feature-image-container" style="background-image: url('${sanitizeInput(a.image || DEFAULT_IMAGE, true)}')"></div>
                        <div class="related-article-text feature-text">
                            <h1 class="related-article-title">${sanitizeInput(a.title || 'Untitled Article')}</h1>
                            <div class="related-article-date">${a.date ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</div>
                            <p class="related-article-lead">${sanitizeInput(a.lead || a.content || 'No content available.')}</p>
                        </div>
                    </div>
                `).join('') : '<div class="no-related-articles">No related articles found.</div>'}
            </div>
        `;

        fragment.appendChild(articleDetail);
        fragment.appendChild(relatedArticlesSection);
        mainContent.innerHTML = '';
        mainContent.appendChild(fragment);

        // Update meta tags for article view
        const articleKeywords = [
            sanitizeInput(article.category?.toLowerCase() || 'news', true),
            sanitizeInput(article.region?.toLowerCase() || 'global', true),
            'Apodictic',
            ...(article.title ? article.title.split(' ').slice(0, 3).map(s => sanitizeInput(s)) : [])
        ].filter(Boolean).join(', ');
        updateMetaTags({
            title: `${sanitizeInput(article.title || 'Article')} - Apodictic`,
            description: sanitizeInput((article.lead || article.content || DEFAULT_DESCRIPTION).substring(0, 160)),
            url: `${BASE_URL}/article/${sanitizeInput(articleId, true)}`,
            image: sanitizeInput(article.image || DEFAULT_IMAGE, true),
            type: 'article',
            keywords: articleKeywords
        });

        history.pushState({ view: 'article', articleId: articleId }, '', `/article/${sanitizeInput(articleId, true)}`);
        debounceAttachArticleEventListeners();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error in showArticleDetail:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading article.</div>';
    }
}

function handleInitialLoad() {
    try {
        const path = window.location.pathname;
        const queryParams = new URLSearchParams(window.location.search);
        console.log('Handling initial load for path:', path, 'with query:', queryParams.toString());

        // Parse query parameters for filters and pagination
        const currentPage = parseInt(queryParams.get('page')) || 1;
        window.currentKeyword = sanitizeInput(queryParams.get('q') || '');
        window.currentRegion = sanitizeInput(queryParams.get('region') || '', true);
        window.currentTopic = sanitizeInput(queryParams.get('topic') || '', true);
        window.currentDate = sanitizeInput(queryParams.get('date') || '', true);

        if (path === '/' || path === '') {
            restoreMainContent();
        } else if (path === '/about') {
            showAboutUsView();
        } else if (path === '/contact') {
            showContactUsView();
        } else if (path === '/privacy') {
            showPrivacyPolicyView();
        } else if (path.startsWith('/section/')) {
            const sectionId = sanitizeInput(path.split('/section/')[1].split('?')[0], true);
            if (['latest', 'world', 'events', 'financial', 'search'].includes(sectionId)) {
                if (sectionId === 'search') {
                    showSearchView(currentPage);
                    if (window.currentKeyword || window.currentRegion || window.currentTopic || window.currentDate) {
                        debounceSearchArticles();
                    }
                } else {
                    showSectionView(sectionId, currentPage);
                    if (window.currentKeyword || window.currentRegion || window.currentTopic || window.currentDate) {
                        debounceFilterSectionArticles(sectionId);
                    }
                }
            } else {
                restoreMainContent();
            }
        } else if (path.startsWith('/article/')) {
            const articleId = sanitizeInput(path.split('/article/')[1].split('?')[0], true);
            showArticleDetail(articleId);
        } else {
            restoreMainContent();
        }
    } catch (error) {
        console.error('Error in handleInitialLoad:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading page.</div>';
    }
}

window.addEventListener('popstate', (event) => {
    try {
        console.log('Popstate event:', event.state);
        if (event.state) {
            if (event.state.view === 'home') restoreMainContent();
            else if (event.state.view === 'about') showAboutUsView();
            else if (event.state.view === 'contact') showContactUsView();
            else if (event.state.view === 'privacy') showPrivacyPolicyView();
            else if (event.state.view === 'section') showSectionView(sanitizeInput(event.state.sectionId, true));
            else if (event.state.view === 'search') showSearchView();
            else if (event.state.view === 'article') showArticleDetail(sanitizeInput(event.state.articleId, true));
        } else {
            restoreMainContent();
        }
    } catch (error) {
        console.error('Error in popstate event:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error navigating page.</div>';
    }
});

function fetchArticles() {
    try {
        const cachedData = localStorage.getItem('articlesData');
        const cacheTimestamp = localStorage.getItem('articlesCacheTimestamp');
        const cacheDuration = 24 * 60 * 60 * 1000;

        if (cachedData && cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < cacheDuration) {
            console.log('Using cached articles');
            articlesData = JSON.parse(cachedData);
            window.indexedArticles = preprocessArticles(articlesData);
            handleInitialLoad();
            return;
        }

        function tryFetch(attempts = 3, delay = 1000) {
            fetch('DB.json')
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load JSON: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    console.log('JSON data loaded:', data);
                    articlesData = data.articles || [];
                    if (articlesData.length === 0) {
                        console.error('No articles found in JSON');
                        document.getElementById('main-content').innerHTML = '<div class="no-articles">No articles found.</div>';
                        return;
                    }
                    window.indexedArticles = preprocessArticles(articlesData);
                    localStorage.setItem('articlesData', JSON.stringify(articlesData));
                    localStorage.setItem('articlesCacheTimestamp', Date.now());
                    handleInitialLoad();
                })
                .catch(error => {
                    console.error('Error loading JSON, attempt', 4 - attempts, ':', error);
                    if (attempts > 1) {
                        setTimeout(() => tryFetch(attempts - 1, delay * 2), delay);
                    } else {
                        document.getElementById('main-content').innerHTML = '<div class="no-articles">Failed to load articles after multiple attempts.</div>';
                    }
                });
        }

        tryFetch();
    } catch (error) {
        console.error('Error in fetchArticles:', error);
        document.getElementById('main-content').innerHTML = '<div class="no-articles">Error loading articles.</div>';
    }
}

fetchArticles();
