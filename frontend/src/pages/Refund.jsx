import React from 'react';
import './LegalPages.css';

const Refund = () => {
  return (
    <div className="legal-container fade-in">
      <div className="legal-card">
        <h1>💰 Refund & Cancellation Policy</h1>
        <p className="legal-date">Last updated: June 30, 2026</p>

        <section>
          <h2>1. In-Game Currency (Shards)</h2>
          <p>
            Shards are virtual in-game currency and are <strong>non-refundable</strong>.
            Once purchased, shards cannot be exchanged for real money.
          </p>
        </section>

        <section>
          <h2>2. Cancellation</h2>
          <p>
            You may cancel a purchase before payment is completed. Once payment is
            successful, the transaction is final and cannot be canceled.
          </p>
        </section>

        <section>
          <h2>3. Refund Eligibility</h2>
          <p>
            Refunds are only provided in the following cases:
          </p>
          <ul>
            <li>
              <strong>Payment Failure:</strong> If money is deducted but shards are
              not added to your account.
            </li>
            <li>
              <strong>Duplicate Payment:</strong> If you are charged multiple times
              for the same transaction.
            </li>
            <li>
              <strong>Technical Error:</strong> If there is a confirmed technical
              error on our side.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. How to Request a Refund</h2>
          <p>
            To request a refund, contact us at <strong>support@anti-akinator.com</strong>
            with the following details:
          </p>
          <ul>
            <li>Your username</li>
            <li>Transaction ID</li>
            <li>Date and time of purchase</li>
            <li>Reason for refund request</li>
          </ul>
          <p>
            Refund requests will be processed within <strong>5-7 business days</strong>.
          </p>
        </section>

        <section>
          <h2>5. No Refund for Used Shards</h2>
          <p>
            Shards that have already been spent on in-game items (hints, etc.) are
            <strong> not eligible for refund</strong>.
          </p>
        </section>

        <section>
          <h2>6. Chargebacks</h2>
          <p>
            In the event of a chargeback, your account will be temporarily suspended
            until the matter is resolved.
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

export default Refund;