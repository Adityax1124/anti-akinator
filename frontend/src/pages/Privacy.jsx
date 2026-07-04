import React from 'react';
import './LegalPages.css';

const Privacy = () => {
  return (
    <div className="legal-container">
      <h1>🔒 Privacy Policy</h1>
      <p className="legal-date">Last updated: July 2026</p>

      <section>
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly, including:</p>
        <ul>
          <li>Username and email address during registration</li>
          <li>Game progress and in-game purchases</li>
          <li>Device information and IP address</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and improve the Game</li>
          <li>Process transactions and send receipts</li>
          <li>Communicate important updates</li>
          <li>Ensure fair gameplay and prevent fraud</li>
        </ul>
      </section>

      <section>
        <h2>3. Cookies</h2>
        <p>We use cookies to enhance your experience, remember preferences, and analyze usage. You can control cookies in your browser settings.</p>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>
        <p>We use third-party services including:</p>
        <ul>
          <li><strong>Google AdSense</strong> - for displaying ads</li>
          <li><strong>Google Analytics</strong> - for analyzing traffic</li>
          <li><strong>Razorpay</strong> - for processing payments</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>We implement reasonable security measures to protect your data. However, no method of transmission is 100% secure.</p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>You may request access, correction, or deletion of your personal data by contacting us at <a href="mailto:support@anti-akinator.in">support@anti-akinator.in</a>.</p>
      </section>

      <section>
        <h2>7. Children's Privacy</h2>
        <p>The Game is not directed at children under 13. We do not knowingly collect personal information from children.</p>
      </section>

      <section>
        <h2>8. Changes to Policy</h2>
        <p>We may update this policy from time to time. We will notify users of significant changes.</p>
      </section>

      <section>
        <h2>9. Contact Us</h2>
        <p>Email: <a href="mailto:support@anti-akinator.in">support@anti-akinator.in</a></p>
      </section>
    </div>
  );
};

export default Privacy;