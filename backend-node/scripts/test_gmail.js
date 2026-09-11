require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('User:', process.env.EMAIL_USER);
  
  // Test 1: smtp.gmail.com port 465 SSL
  console.log('Testing port 465 SSL...');
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
    
    await transporter465.verify();
    console.log('✓ Port 465 SSL verified successfully!');
    return;
  } catch (err) {
    console.error('✗ Port 465 failed:', err.message);
  }

  // Test 2: smtp.gmail.com port 587 TLS
  console.log('Testing port 587 TLS...');
  try {
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
    
    await transporter587.verify();
    console.log('✓ Port 587 TLS verified successfully!');
    return;
  } catch (err) {
    console.error('✗ Port 587 failed:', err.message);
  }
}

testGmail();
