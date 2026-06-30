import React from 'react';
import './LegalPages.css';

const Terms = () => {
  return (
    <div className="legal-container fade-in">
      <div className="legal-card">
        <h1>📜 Terms & Conditions</h1>
        <p className="legal-date">Last updated: June 30, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using Anti-Akinator ("the Game"), you agree to these Terms & Conditions.
            If you do not agree, please do not use the Game.
          </p>
        </section>

        <section>
          <h2>2. User Eligibility</h2>
          <p>
            You must be at least 18 years old to make purchases in the Game.
            By using the Game, you confirm that you meet this age requirement.
          </p>
        </section>

        <section>
          <h2>3. Account Responsibility</h2>
          <p>
            You are responsible for maintaining the security of your account.
            You are responsible for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2>4. In-Game Currency (Shards)</h2>
          <p>
            Shards are in-game virtual currency. They have no real-world value.
            Shards cannot be exchanged for real money or any other form of currency.
          </p>
        </section>

        <section>
          <h2>5. User Conduct</h2>
          <p>
            You agree not to:
          </p>
          <ul>
            <li>Use the Game for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to the Game's systems.</li>
            <li>Exploit bugs or glitches in the Game.</li>
            <li>Harass or bully other users.</li>
          </ul>
        </section>

        <section>
          <h2>6. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account for violations
            of these terms, cheating, or any conduct that we deem harmful to the Game.
          </p>
        </section>

        <section>
          <h2>7. Governing Law</h2>
          <p>
            These terms are governed by the laws of India. Any disputes shall be
            resolved in the courts of India.
          </p>
        </section>

        <section>
          <h2>8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Game
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            For any questions regarding these terms, please contact us at:
            <br />
            <strong>Email:</strong> support@anti-akinator.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;