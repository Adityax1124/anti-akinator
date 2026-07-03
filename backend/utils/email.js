const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send OTP Email
const sendOTPEmail = async (email, otp, username) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #1a1a2e; border-radius: 16px; color: #fff;">
      <h1 style="text-align: center; color: #ffd700;">🎯 Anti-Akinator</h1>
      <h2 style="text-align: center;">Verify Your Email</h2>
      <p style="text-align: center; color: #aaa;">Hi ${username},</p>
      <p style="text-align: center; color: #aaa;">Enter the following OTP to verify your email address:</p>
      <div style="text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; margin: 20px 0;">
        <h1 style="font-size: 48px; letter-spacing: 10px; color: #ffd700; margin: 0;">${otp}</h1>
      </div>
      <p style="text-align: center; color: #666; font-size: 14px;">This OTP will expire in <strong>5 minutes</strong>.</p>
      <p style="text-align: center; color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      <hr style="border-color: rgba(255,255,255,0.05);">
      <p style="text-align: center; color: #444; font-size: 12px;">Anti-Akinator - The Reverse Guessing Game</p>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Anti-Akinator <noreply@anti-akinator.com>',
    to: email,
    subject: 'Verify Your Email - Anti-Akinator',
    html
  });
};

// Send Welcome Email
const sendWelcomeEmail = async (email, username) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #1a1a2e; border-radius: 16px; color: #fff;">
      <h1 style="text-align: center; color: #ffd700;">🎯 Anti-Akinator</h1>
      <h2 style="text-align: center;">Welcome, ${username}! 🎉</h2>
      <p style="text-align: center; color: #aaa;">Your email has been verified successfully!</p>
      <p style="text-align: center; color: #aaa;">Start playing and guess the secret anime character!</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.CLIENT_URL}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #6c63ff, #5a52d5); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Play Now 🚀</a>
      </div>
      <hr style="border-color: rgba(255,255,255,0.05);">
      <p style="text-align: center; color: #444; font-size: 12px;">Anti-Akinator - The Reverse Guessing Game</p>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Anti-Akinator <noreply@anti-akinator.com>',
    to: email,
    subject: 'Welcome to Anti-Akinator! 🎉',
    html
  });
};

module.exports = { sendOTPEmail, sendWelcomeEmail };