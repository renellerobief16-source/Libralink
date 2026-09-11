const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const nodemailer = require('nodemailer');
let mailgun = null;
try {
  mailgun = require('mailgun-js');
} catch (e) {
  console.warn('[EMAIL] mailgun-js not installed or failed to load, Mailgun fallback disabled.');
}

// Unified multi-provider dispatcher: Resend (HTTPS 443) -> SendGrid (HTTPS 443) -> Mailgun -> Gmail SMTP
const sendEmailWithFallbacks = async ({ to, subject, html }) => {
  // 1. Resend HTTPS API (Port 443 - 100% unblocked on Render and Vercel)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EMAIL] Attempting dispatch via Resend HTTPS API to ${to}...`);
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Libralink <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: html
        })
      });
      const resendData = await resendRes.json();
      if (resendRes.ok && resendData.id) {
        console.log(`[EMAIL] Successfully sent via Resend API:`, resendData.id);
        return { success: true, messageId: resendData.id, provider: 'resend' };
      } else {
        console.warn(`[EMAIL] Resend error notice:`, resendData);
      }
    } catch (resendErr) {
      console.warn(`[EMAIL] Resend request exception:`, resendErr.message);
    }
  }

  // 1.5 Brevo HTTPS API (Port 443 - free 300 emails/day to ANY recipient without domain verification)
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[EMAIL] Attempting dispatch via Brevo HTTPS API to ${to}...`);
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Libralink', email: process.env.EMAIL_USER || 'libralink1620@gmail.com' },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html
        })
      });
      const brevoData = await brevoRes.json();
      if (brevoRes.ok && brevoData.messageId) {
        console.log(`[EMAIL] Successfully sent via Brevo HTTPS API:`, brevoData.messageId);
        return { success: true, messageId: brevoData.messageId, provider: 'brevo' };
      } else {
        console.warn(`[EMAIL] Brevo error notice:`, brevoData);
      }
    } catch (brevoErr) {
      console.warn(`[EMAIL] Brevo request exception:`, brevoErr.message);
    }
  }

  // 2. SendGrid HTTPS API (Port 443)
  if (process.env.SENDGRID_API_KEY) {
    try {
      console.log(`[EMAIL] Attempting dispatch via SendGrid HTTPS API to ${to}...`);
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || 'libralink1620@gmail.com', name: 'Libralink' },
          subject: subject,
          content: [{ type: 'text/html', value: html }]
        })
      });
      if (sgRes.status === 202 || sgRes.ok) {
        console.log(`[EMAIL] Successfully sent via SendGrid HTTPS API`);
        return { success: true, messageId: 'sendgrid_api_ok', provider: 'sendgrid' };
      }
    } catch (sgErr) {
      console.warn(`[EMAIL] SendGrid request exception:`, sgErr.message);
    }
  }

  // 3. Mailgun API (if configured)
  if (mailgun && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    try {
      console.log(`[EMAIL] Attempting dispatch via Mailgun API to ${to}...`);
      const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });
      const senderEmail = process.env.MAILGUN_FROM_EMAIL || 'libralink1620@gmail.com';
      const body = await mg.messages().send({ from: senderEmail, to, subject, html });
      console.log(`[EMAIL] Successfully sent via Mailgun:`, body.id);
      return { success: true, messageId: body.id, provider: 'mailgun' };
    } catch (mgErr) {
      console.warn(`[EMAIL] Mailgun error:`, mgErr.message);
    }
  }

  // 4. Nodemailer Gmail SMTP fallback (for local dev / environments with open ports)
  try {
    console.log(`[EMAIL] Attempting dispatch via Gmail SMTP to ${to}...`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'libralink1620@gmail.com',
        pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || 'ignklmhlitookgsz'
      },
      connectionTimeout: 7000,
      greetingTimeout: 5000,
      socketTimeout: 7000
    });

    const info = await transporter.sendMail({
      from: `"Libralink" <${process.env.EMAIL_USER || process.env.GMAIL_USER || 'libralink1620@gmail.com'}>`,
      to: to,
      subject: subject,
      html: html
    });
    console.log(`[EMAIL] Successfully sent via Gmail SMTP:`, info.messageId);
    return { success: true, messageId: info.messageId, provider: 'gmail_smtp' };
  } catch (smtpErr) {
    console.warn(`[EMAIL] Gmail default failed (${smtpErr.message}), trying port 587 STARTTLS...`);
    try {
      const transporter587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'libralink1620@gmail.com',
          pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || 'ignklmhlitookgsz'
        },
        connectionTimeout: 7000,
        greetingTimeout: 5000,
        socketTimeout: 7000
      });
      const info587 = await transporter587.sendMail({
        from: `"Libralink" <${process.env.EMAIL_USER || process.env.GMAIL_USER || 'libralink1620@gmail.com'}>`,
        to: to,
        subject: subject,
        html: html
      });
      console.log(`[EMAIL] Successfully sent via Gmail port 587:`, info587.messageId);
      return { success: true, messageId: info587.messageId, provider: 'gmail_smtp_587' };
    } catch (err587) {
      console.error(`[EMAIL] All Gmail SMTP dispatches failed:`, err587.message);
      return { success: false, error: `SMTP 465 (${smtpErr.message}) / SMTP 587 (${err587.message})` };
    }
  }
};

// Send verification code email
const sendVerificationEmail = async (email, code) => {
  const html = `
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
        <p>© 2026 Libralink. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmailWithFallbacks({
    to: email,
    subject: 'Libralink - Email Verification Code',
    html
  });
};

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'libralink1620@gmail.com',
      pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || 'ignklmhlitookgsz'
    },
    connectionTimeout: 8000,
    greetingTimeout: 6000,
    socketTimeout: 8000
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
  const html = `
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
        <p>© 2026 Libralink. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmailWithFallbacks({
    to: email,
    subject: 'Libralink - Password Reset',
    html
  });
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

    return await sendEmailWithFallbacks({
      to: toEmail,
      subject: mailOptions.subject,
      html: mailOptions.html
    });
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

    return await sendEmailWithFallbacks({
      to: toEmail,
      subject: mailOptions.subject,
      html: mailOptions.html
    });
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
