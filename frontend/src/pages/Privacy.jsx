import React from 'react';
import './LegalPages.css';

const Privacy = () => {
  return (
    <div className="legal-container fade-in">
      <div className="legal-card">
        <h1>🔒 Privacy Policy</h1>
        <p className="legal-date">Last updated: June 30, 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect the following information:</p>
          <ul>
            <li><strong>Account Data:</strong> Username, email address, and hashed password.</li>
            <li><strong>Game Data:</strong> Game history, wins, streaks, shards, and achievements.</li>
            <li><strong>Transaction Data:</strong> Payment history (processed through Razorpay).</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and improve the Game.</li>
            <li>To process your transactions.</li>
            <li>To communicate with you about updates and promotions.</li>
            <li>To prevent fraud and ensure fair play.</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Sharing</h2>
          <p>
            We do not sell your personal information. We share data only with:
          </p>
          <ul>
            <li><strong>Razorpay:</strong> For payment processing.</li>
            <li><strong>MongoDB Atlas:</strong> For data storage.</li>
            <li><strong>Groq/Gemini/Mistral:</strong> For AI-powered game responses.</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data.
            Passwords are hashed and never stored in plain text.
          </p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data.</li>
            <li>Request correction of your data.</li>
            <li>Request deletion of your data.</li>
            <li>Withdraw consent for data processing.</li>
          </ul>
        </section>

        <section>
          <h2>6. Cookies</h2>
          <p>
            We use cookies to keep you logged in and to improve your experience.
            You can disable cookies in your browser settings.
          </p>
        </section>

        <section>
          <h2>7. Contact Us</h2>
          <p>
            <strong>Email:</strong> support@anti-akinator.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;