import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer>
    <div className="container footer-p">
      <Link to="/about">About Us</Link>
      <Link to="/contact">Contact Us</Link>
      <Link to="/privacy">Privacy Policy</Link>
    </div>
  </footer>
);

export default Footer;