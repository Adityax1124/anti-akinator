import React from 'react';
import './LegalPages.css';

const Terms = () => {
  return (
    <div className="legal-container">
      <h1>📜 Terms & Conditions</h1>
      <p className="legal-date">Last updated: July 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By using Anti-Akinator ("the Game"), you agree to these Terms & Conditions. If you do not agree, please do not use the Game.</p>
      </section>

      <section>
        <h2>2. Account Registration</h2>
        <p>You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials.</p>
      </section>

      <section>
        <h2>3. Game Rules</h2>
        <p>Players must not cheat, exploit bugs, or use unauthorized third-party software. Violation may result in account suspension or termination.</p>
      </section>

      <section>
        <h2>4. In-Game Purchases</h2>
        <p>All purchases are final and non-refundable unless otherwise stated in our Refund Policy. Prices are subject to change.</p>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>All content, including characters, artwork, and code, is the property of Anti-Akinator. Users may not copy, modify, or distribute without permission.</p>
      </section>

      <section>
        <h2>6. Termination</h2>
        <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.</p>
      </section>

      <section>
        <h2>7. Limitation of Liability</h2>
        <p>The Game is provided "as is." We are not liable for any damages arising from the use of the Game.</p>
      </section>

      <section>
        <h2>8. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use constitutes acceptance of the updated terms.</p>
      </section>

      <section>
        <h2>9. Contact Us</h2>
        <p>For any questions, please email us at: <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
      </section>
    </div>
  );
};

export default Terms;