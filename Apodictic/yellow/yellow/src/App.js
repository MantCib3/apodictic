import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Section from './pages/Section';
import Article from './pages/Article';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Search from './pages/Search';
import './styles.css'; // Import global styles

function App() {
  return (
    <Router>
      <Header />
      <main id="main-content" className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/section/:section" element={<Section />} />
          <Route path="/article/:id" element={<Article />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/section/search" element={<Search />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;