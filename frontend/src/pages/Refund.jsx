import React, { useState, useEffect } from 'react';
import './LegalPages.css';

const Refund = () => {
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
            <span className="legal-title-gradient">Refund & Cancellation</span>
          </h1>
          <p className="legal-date">Last updated: July 2026</p>
        </div>
      </section>

      <div className="legal-sections">
        <div className="legal-section">
          <span className="legal-section-number">01</span>
          <h2>In-Game Purchases</h2>
          <p>All in-game purchases, including Shards, Gems, and Card Packs, are <strong>non-refundable</strong> once the transaction is completed.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">02</span>
          <h2>Subscription Services</h2>
          <p>If you have subscribed to a premium service, you may cancel at any time. No refunds will be provided for partial subscription periods.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">03</span>
          <h2>Technical Issues</h2>
          <p>If you experience technical issues that prevent you from receiving your purchase, please contact us within <strong>7 days</strong> for assistance. We will investigate and may offer a refund or credit at our discretion.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">04</span>
          <h2>Unauthorized Transactions</h2>
          <p>If you believe an unauthorized transaction has been made, please contact us immediately. We will work with you and the payment provider to resolve the issue.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">05</span>
          <h2>How to Request a Refund</h2>
          <p>To request a refund or report an issue:</p>
          <ul>
            <li>Email us at <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></li>
            <li>Include your username, transaction ID, and a brief description of the issue</li>
            <li>We will respond within <strong>3-5 business days</strong></li>
          </ul>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">06</span>
          <h2>Chargebacks</h2>
          <p>Initiating a chargeback without prior communication may result in account suspension pending investigation.</p>
        </div>

        <div className="legal-section">
          <span className="legal-section-number">07</span>
          <h2>Contact Us</h2>
          <p>Email: <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default Refund;