const nodemailer = require('nodemailer');
let mailgun = null;
try {
  mailgun = require('mailgun-js');
} catch (e) {
  console.warn('[EMAIL] mailgun-js not installed or failed to load, Mailgun fallback disabled.');
}

// Create transporter using Gmail SMTP with fallback to alternative
const createTransporter = () => {
  // Try using SendGrid if configured
  console.log('[EMAIL] SENDGRID_API_KEY configured:', !!process.env.SENDGRID_API_KEY);
  if (process.env.SENDGRID_API_KEY) {
    console.log('[EMAIL] Using SendGrid for email sending');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      // Add timeout settings for cloud environments
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  // Fallback to Gmail SMTP (port 465 SSL for high reliability)
  console.log('[EMAIL] Using Gmail SMTP SSL (smtp.gmail.com:465) for email sending');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || process.env.GMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

// Send verification code email
const sendVerificationEmail = async (email, code) => {
  try {
    console.log('[EMAIL] Starting email send process to:', email);

    // Use Mailgun if API key is configured and library is loaded
    if (mailgun && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      console.log('[EMAIL] Using Mailgun for email sending');
      const mg = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      });

      const senderEmail = process.env.MAILGUN_FROM_EMAIL || 'renellerobieF16@gmail.com';
      console.log('[EMAIL] Sender email:', senderEmail);

      const data = {
        from: senderEmail,
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

      console.log('[EMAIL] Sending via Mailgun...');
      const body = await mg.messages().send(data);
      console.log(`[EMAIL] Verification email sent successfully to ${email} via Mailgun`);
      return { success: true, messageId: body.id };
    }

    // Fallback to nodemailer
    console.log('[EMAIL] Using nodemailer for email sending');
    const transporter = createTransporter();
    console.log('[EMAIL] Transporter created, preparing to send...');

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

    console.log('[EMAIL] Calling transporter.sendMail...');
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Verification email sent successfully to ${email}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending verification email:', error.message);
    console.error('[EMAIL] Full error:', error);
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

// Send student welcome & library portal credentials email with School Code Security Gate
const sendStudentCredentialsEmail = async ({
  toEmail,
  studentName,
  studentId,
  portalEmail,
  temporaryPassword,
  schoolName = 'Library Institution',
  schoolCode = 'SRC',
  claimToken = '',
  academicLevel = 'College',
  courseOrGrade = 'Enrolled Student'
}) => {
  try {
    const transporter = createTransporter();
    const baseUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173';
    const claimUrl = claimToken ? `${baseUrl}/claim-account?token=${encodeURIComponent(claimToken)}` : `${baseUrl}/claim-account`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'no-reply@libralink.com',
      to: toEmail,
      subject: `[${schoolCode || 'Libralink'}] Action Required: View Your Library Account Credentials`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background-color: #f8fafc; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #0077b6 0%, #023e8a 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Libralink</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Connected Academic Library Management System</p>
            <div style="display: inline-block; margin-top: 14px; padding: 5px 16px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
              ${schoolName} (${schoolCode})
            </div>
          </div>

          <div style="background: #ffffff; padding: 32px 28px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">Welcome, ${studentName}!</h2>
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #475569; font-size: 14px;">
              Your student borrower account has been successfully registered under <strong>${academicLevel}</strong> (${courseOrGrade}). You can now access library catalogs, borrow physical books, place holds, and explore digital resources.
            </p>

            <!-- Protected Credentials Gate Announcement -->
            <div style="background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 24px 20px; text-align: center; margin: 24px 0;">
              <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
              <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
                Protected Libralink Account Credentials
              </h3>
              <p style="margin: 0 0 16px 0; color: #475569; font-size: 13px; line-height: 1.5; max-width: 440px; margin-left: auto; margin-right: auto;">
                For your security and privacy, your Libralink login credentials (username, student ID, and temporary password) are protected. Click the button below and enter your <strong>Student Number / LRN</strong> to unlock your account.
              </p>

              <!-- Step by step visual helper -->
              <div style="margin: 16px auto; padding: 14px 18px; background: #ffffff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 13px; color: #0369a1; text-align: left; max-width: 440px;">
                <div style="margin-bottom: 8px;"><strong>Step 1:</strong> Click the blue button below to open the account unlock page.</div>
                <div><strong>Step 2:</strong> Enter your <strong>Student Number / LRN</strong> (from your school ID or registration slip) to reveal your username and password.</div>
              </div>
              
              <div style="margin-top: 20px;">
                <a href="${claimUrl}" style="background: #0077b6; color: white; padding: 14px 34px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,119,182,0.35);">
                  👉 Click Here to Unlock & View Account →
                </a>
              </div>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #92400e; text-align: left;">
              ⚠️ <strong>Single-Use Security Notice:</strong> This unlock link is strictly valid for <strong>one-time access only</strong>. Once unlocked, your login credentials will be displayed. Make sure to copy them immediately as this link will permanently expire.
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 11px; color: #94a3b8;">Direct Web Link:</span><br/>
              <a href="${claimUrl}" style="font-size: 12px; color: #0077b6; word-break: break-all; font-weight: 600;">
                ${claimUrl}
              </a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
              This notification was generated automatically by the institutional library system at ${schoolName}. If you have any inquiries, please visit your campus library circulation counter.
            </p>
          </div>

          <div style="text-align: center; margin-top: 16px; color: #94a3b8; font-size: 11px;">
            <p>© ${new Date().getFullYear()} Libralink Consortium. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Student credentials invitation successfully dispatched to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn('[EMAIL] Notice: Could not send student credentials email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send direct email notice from librarian to student/patron
const sendDirectLibrarianEmail = async ({
  toEmail,
  recipientName = 'Library Patron',
  subject = 'Notice from Library Administration',
  messageBody = '',
  templateType = 'notice',
  schoolName = 'Library Institution'
}) => {
  try {
    const transporter = createTransporter();

    const formattedBody = messageBody
      .split('\n')
      .filter(line => line.trim())
      .map(line => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155; font-size: 14px;">${line}</p>`)
      .join('');

    const mailOptions = {
      from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'no-reply@libralink.com',
      to: toEmail,
      subject: `[${schoolName}] ${subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background-color: #f8fafc; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%); padding: 28px 24px; border-radius: 16px 16px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Libralink</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Official Library Administrative Notice</p>
            <div style="display: inline-block; margin-top: 10px; padding: 4px 12px; background: rgba(255,255,255,0.18); border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
              ${schoolName}
            </div>
          </div>

          <div style="background: #ffffff; padding: 32px 28px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
              Dear ${recipientName},
            </p>

            <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 6px; margin: 18px 0 24px 0;">
              ${formattedBody}
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="http://localhost:5173/login" style="background: #0284c7; color: white; padding: 10px 26px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 700; display: inline-block;">
                Access Library Portal →
              </a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center; border-top: 1px solid #f1f5f9; pt-4">
              This message was sent directly by the library circulation department of ${schoolName}. If you have questions, please present this email at the library help desk.
            </p>
          </div>

          <div style="text-align: center; margin-top: 16px; color: #94a3b8; font-size: 11px;">
            <p>© ${new Date().getFullYear()} Libralink Consortium. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Direct librarian message sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn('[EMAIL] Error sending direct message:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendStudentCredentialsEmail,
  sendDirectLibrarianEmail
};
