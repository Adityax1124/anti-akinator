import React from 'react';
import './LegalPages.css';

const Refund = () => {
  return (
    <div className="legal-container">
      <h1>💰 Refund & Cancellation Policy</h1>
      <p className="legal-date">Last updated: July 2026</p>

      <section>
        <h2>1. In-Game Purchases</h2>
        <p>All in-game purchases, including Shards, Gems, and Card Packs, are <strong>non-refundable</strong> once the transaction is completed.</p>
      </section>

      <section>
        <h2>2. Subscription Services</h2>
        <p>If you have subscribed to a premium service, you may cancel at any time. No refunds will be provided for partial subscription periods.</p>
      </section>

      <section>
        <h2>3. Technical Issues</h2>
        <p>If you experience technical issues that prevent you from receiving your purchase, please contact us within <strong>7 days</strong> for assistance. We will investigate and may offer a refund or credit at our discretion.</p>
      </section>

      <section>
        <h2>4. Unauthorized Transactions</h2>
        <p>If you believe an unauthorized transaction has been made, please contact us immediately. We will work with you and the payment provider to resolve the issue.</p>
      </section>

      <section>
        <h2>5. How to Request a Refund</h2>
        <p>To request a refund or report an issue:</p>
        <ul>
          <li>Email us at <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></li>
          <li>Include your username, transaction ID, and a brief description of the issue</li>
          <li>We will respond within <strong>3-5 business days</strong></li>
        </ul>
      </section>

      <section>
        <h2>6. Chargebacks</h2>
        <p>Initiating a chargeback without prior communication may result in account suspension pending investigation.</p>
      </section>

      <section>
        <h2>7. Contact Us</h2>
        <p>Email: <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
      </section>
    </div>
  );
};

export default Refund;