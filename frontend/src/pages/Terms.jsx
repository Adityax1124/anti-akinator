import React, { useState, useEffect } from 'react';
import './LegalPages.css';

const Terms = () => {
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
            <span className="legal-title-gradient">Terms & Conditions</span>
          </h1>
          <p className="legal-date">Last updated: July 2026</p>
        </div>
      </section>

      <div className="legal-sections">
        <div className="legal-section">
          <span className="legal-section-number">01</span>
          <h2>Acceptance of Terms</h2>
          <p>By using Anti-Akinator ("the Game"), you agree to these Terms & Conditions. If you do not agree, please do not use the Game.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">02</span>
          <h2>Account Registration</h2>
          <p>You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">03</span>
          <h2>Game Rules</h2>
          <p>Players must not cheat, exploit bugs, or use unauthorized third-party software. Violation may result in account suspension or termination.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">04</span>
          <h2>In-Game Purchases</h2>
          <p>All purchases are final and non-refundable unless otherwise stated in our Refund Policy. Prices are subject to change.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">05</span>
          <h2>Intellectual Property</h2>
          <p>All content, including characters, artwork, and code, is the property of Anti-Akinator. Users may not copy, modify, or distribute without permission.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">06</span>
          <h2>Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">07</span>
          <h2>Limitation of Liability</h2>
          <p>The Game is provided "as is." We are not liable for any damages arising from the use of the Game.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">08</span>
          <h2>Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use constitutes acceptance of the updated terms.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">09</span>
          <h2>Contact Us</h2>
          <p>For any questions, please email us at: <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default Terms;