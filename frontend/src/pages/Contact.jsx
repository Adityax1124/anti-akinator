import React, { useState } from 'react';
import './LegalPages.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('');

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
    <div className="legal-container contact-page">
      <h1>📧 Contact Us</h1>
      <p className="contact-subtitle">
        Have questions, feedback, or issues? We'd love to hear from you!
      </p>

      <div className="contact-grid">
        <div className="contact-info">
          <h3>📬 Get in Touch</h3>
          <p><strong>Email:</strong> <a href="mailto:akinator.anti@gmail.com">akinator.anti@gmail.com</a></p>
          <p><strong>Response Time:</strong> 24-48 hours</p>
          <p><strong>Location:</strong> India</p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
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
          <button type="submit">Send Message</button>
          {status && <p className="status">{status}</p>}
        </form>
      </div>
    </div>
  );
};

export default Contact;