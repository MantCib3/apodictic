import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [searchActive, setSearchActive] = useState(false);

  const toggleSearch = () => setSearchActive(!searchActive);

  return (
    <header>
      <div className="header-content">
        <div className="logo">
          <Link to="/">
            <img src="/assets/logo.png" alt="Apodictic Logo" />
          </Link>
        </div>
        <nav>
          <ul>
            <li><Link to="/section/latest">Latest</Link></li>
            <li><Link to="/section/world">World</Link></li>
            <li><Link to="/section/events">Events</Link></li>
            <li><Link to="/section/finance">Finance</Link></li>
          </ul>
        </nav>
        <div className="search-nav">
          <Link to="/section/search" className="search-link">Search</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;