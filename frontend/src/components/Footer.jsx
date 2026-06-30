import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">🎯 Anti-Akinator</span>
          <p className="footer-tagline">The Reverse Guessing Game</p>
        </div>

        <div className="footer-links">
          <Link to="/terms" className="footer-link">Terms & Conditions</Link>
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          <Link to="/refund" className="footer-link">Refund & Cancellation Policy</Link>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} Anti-Akinator. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;