const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP with fallback to alternative
const createTransporter = () => {
  // Try using SendGrid if configured
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Fallback to Gmail SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || process.env.GMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD
    },
    // Add timeout and connection settings for cloud environments
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
};

// Send verification code email
const sendVerificationEmail = async (email, code) => {
  try {
    console.log('[EMAIL] Starting email send process to:', email);

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || process.env.GMAIL_USER,
      to: email,
      subject: 'Libralink - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0077B6 0%, #023E8A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Libralink</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Connected Libraries</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #0F172A; margin-top: 0;">Verify Your Email</h2>
            <p style="color: #64748B; line-height: 1.6;">Thank you for using Libralink. Please use the following verification code to complete your email verification:</p>

            <div style="background: white; border: 2px solid #0077B6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; color: #0077B6; letter-spacing: 5px;">${code}</span>
            </div>

            <p style="color: #64748B; font-size: 14px; margin-bottom: 0;">This code will expire in 15 minutes. If you didn't request this code, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #94A3B8; font-size: 12px;">
            <p>© 2024 Libralink. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Verification email sent successfully to ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending verification email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || process.env.GMAIL_USER,
      to: email,
      subject: 'Libralink - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0077B6 0%, #023E8A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Libralink</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Connected Libraries</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #0F172A; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #64748B; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #0077B6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            
            <p style="color: #64748B; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #0077B6; word-break: break-all; font-size: 12px;">${resetLink}</p>
            
            <p style="color: #64748B; font-size: 14px; margin-top: 20px;">If you didn't request this password reset, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #94A3B8; font-size: 12px;">
            <p>© 2024 Libralink. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Password reset email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
