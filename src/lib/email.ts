import nodemailer from 'nodemailer';

// Use environment variables for email configuration
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

// --- IMPORTANT SECURITY WARNING ---
// The login error "Invalid login: 535-5.7.8 Username and Password not accepted"
// usually means Google has blocked the login attempt for security reasons.
// To fix this, you MUST generate and use an "App Password" for this application.
// 1. Go to your Google Account settings: https://myaccount.google.com/
// 2. Enable 2-Step Verification.
// 3. Go to "App passwords", generate a new password for this app, and use it
//    as the value for `emailPass` above.
// For security, it is strongly recommended to use environment variables 
// (e.g., process.env.EMAIL_PASS) to store this password instead of hardcoding it.
// ---

if (!emailUser || !emailPass) {
  console.error("FATAL ERROR: Email credentials (EMAIL_USER, EMAIL_PASS) are not set in environment variables.");
  // In a real app, you might want to prevent the app from starting or disable email functionality.
}

// Email configuration with better security
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  // Additional security settings
  secure: true, // Use SSL/TLS
  tls: {
    rejectUnauthorized: false // Only for development - remove in production
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const mailOptions = {
      from: `"BeachGuardians" <${emailUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to}`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Test email configuration
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};
