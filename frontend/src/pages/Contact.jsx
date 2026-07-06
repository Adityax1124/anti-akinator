import React, { useState, useEffect } from 'react';
import './LegalPages.css';

const Contact = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('Opening email client...');

    const mailtoLink = `mailto:akinator.anti@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`)}`;
    window.location.href = mailtoLink;
    setStatus('Email client opened!');
  };

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
            Get in Touch
          </div>
          <h1 className="legal-title">
            <span className="legal-title-gradient">Contact Us</span>
          </h1>
          <p className="legal-date">We usually respond within 24-48 hours</p>
        </div>
      </section>

      <div className="contact-grid">
        <div className="contact-info-card">
          <h3>Get in Touch</h3>
          <div className="contact-info-row">
            <strong>Email</strong>
            <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a>
          </div>
          <div className="contact-info-row">
            <strong>Response Time</strong>
            24-48 hours
          </div>
          <div className="contact-info-row">
            <strong>Location</strong>
            India
          </div>
        </div>

        <form className="contact-form-card" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
          <textarea
            name="message"
            placeholder="Your Message"
            rows="5"
            value={formData.message}
            onChange={handleChange}
            required
          />
          <button type="submit" className="contact-submit-btn">
            <span>Send Message</span>
          </button>
          {status && <p className="contact-status">{status}</p>}
        </form>
      </div>
    </div>
  );
};

export default Contact;