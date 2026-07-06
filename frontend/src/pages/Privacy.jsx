import React, { useState, useEffect } from 'react';
import './LegalPages.css';

const Privacy = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`legal-page ${isVisible ? 'visible' : ''}`}>
      <div className="legal-bg-noise"></div>
      <div className="legal-bg-grid"></div>

      <section className="legal-hero">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="legal-hero-content">
          <div className="legal-badge">
            <span className="legal-badge-dot"></span>
            Legal
          </div>
          <h1 className="legal-title">
            <span className="legal-title-gradient">Privacy Policy</span>
          </h1>
          <p className="legal-date">Last updated: July 2026</p>
        </div>
      </section>

      <div className="legal-sections">
        <div className="legal-section">
          <span className="legal-section-number">01</span>
          <h2>Information We Collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul>
            <li>Username and email address during registration</li>
            <li>Game progress and in-game purchases</li>
            <li>Device information and IP address</li>
          </ul>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">02</span>
          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve the Game</li>
            <li>Process transactions and send receipts</li>
            <li>Communicate important updates</li>
            <li>Ensure fair gameplay and prevent fraud</li>
          </ul>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">03</span>
          <h2>Cookies</h2>
          <p>We use cookies to enhance your experience, remember preferences, and analyze usage. You can control cookies in your browser settings.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">04</span>
          <h2>Third-Party Services</h2>
          <p>We use third-party services including:</p>
          <ul>
            <li><strong>Google AdSense</strong> — for displaying ads</li>
            <li><strong>Google Analytics</strong> — for analyzing traffic</li>
            <li><strong>Razorpay</strong> — for processing payments</li>
          </ul>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">05</span>
          <h2>Data Security</h2>
          <p>We implement reasonable security measures to protect your data. However, no method of transmission is 100% secure.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">06</span>
          <h2>Your Rights</h2>
          <p>You may request access, correction, or deletion of your personal data by contacting us at <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a>.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">07</span>
          <h2>Children's Privacy</h2>
          <p>The Game is not directed at children under 13. We do not knowingly collect personal information from children.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">08</span>
          <h2>Changes to Policy</h2>
          <p>We may update this policy from time to time. We will notify users of significant changes.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">09</span>
          <h2>Contact Us</h2>
          <p>Email: <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;