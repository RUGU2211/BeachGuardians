// This file is client-safe and contains templates for generating email HTML content.

export const getWelcomeEmailTemplate = (name: string) => {
    return {
      subject: 'Welcome to BeachGuardians!',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome aboard, ${name}!</h2>
          <p>Thank you for joining BeachGuardians. We are thrilled to have you as part of our community dedicated to protecting our beautiful coastlines.</p>
          <p>You can now log in to your account, find cleanup events, and start tracking your impact.</p>
          <a href="https://your-app-url/login" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
          <p>Together, we can create a cleaner future for our planet.</p>
          <p>Best regards,<br/>The BeachGuardians Team</p>
        </div>
      `,
    };
  };
  
  export const getLoginNotificationTemplate = (name: string, ip: string, device: string) => {
    return {
      subject: 'Security Alert: New Login to Your BeachGuardians Account',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hi ${name},</h2>
          <p>We're writing to let you know that there was a recent login to your BeachGuardians account.</p>
          <p>
            <strong>Time:</strong> ${new Date().toLocaleString()}<br/>
            <strong>IP Address:</strong> ${ip}<br/>
            <strong>Device:</strong> ${device}
          </p>
          <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately by changing your password and contacting our support team.</p>
          <p>Thank you for helping us keep your account secure.</p>
          <p>Best regards,<br/>The BeachGuardians Team</p>
        </div>
      `,
    };
  };
  
  export const getEventRegistrationConfirmationTemplate = (name: string, eventName: string, eventDate: string) => {
    return {
      subject: `Confirmation for Your Registration: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hi ${name},</h2>
          <p>You're all set! This email confirms your registration for the upcoming event:</p>
          <h3>${eventName}</h3>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p>We're excited to see you there and make a positive impact together. Further details about the event will be sent closer to the date.</p>
          <p>Thank you for your commitment to our coasts!</p>
          <p>Best regards,<br/>The BeachGuardians Team</p>
        </div>
      `,
    };
  };
  
  export const getNewEventNotificationTemplate = (eventName: string, eventDate: string, eventLocation: string) => {
    return {
      subject: `New Event Alert: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Community Event!</h2>
          <p>Hello Beach Guardian,</p>
          <p>A new cleanup event has just been scheduled, and we'd love for you to be a part of it!</p>
          <h3>${eventName}</h3>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
          <p>Join us in making a difference. You can view more details and sign up on the events page in your dashboard.</p>
          <p>Thank you for your continued dedication to our coastlines!</p>
          <p>Best regards,<br/>The BeachGuardians Team</p>
        </div>
      `,
    };
  };

/**
 * Generates the email content for admin OTP verification.
 */
export function getAdminVerificationEmailTemplate(otp: string) {
  const subject = 'Your Admin Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Admin Account Verification</h2>
      <p>Hello,</p>
      <p>Thank you for being a part of the BeachGuardians admin team. To complete your account verification, please use the following One-Time Password (OTP).</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; text-align: center;">
        ${otp}
      </p>
      <p>This code will expire in 10 minutes. If you did not request this code, please disregard this email.</p>
      <p>Best regards,<br/>The BeachGuardians Team</p>
    </div>
  `;
  return { subject, html };
}

/**
 * Generates the email content for volunteer OTP verification during registration.
 */
export function getVolunteerVerificationEmailTemplate(name: string, otp: string) {
  const subject = 'Verify Your BeachGuardians Account';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to BeachGuardians, ${name}!</h2>
      <p>Thank you for joining our community of environmental champions. To complete your registration and verify your email address, please use the following verification code:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; text-align: center; color: #007bff;">
        ${otp}
      </p>
      <p>This verification code will expire in 10 minutes. Please enter this code on the registration page to complete your account setup.</p>
      <p>Once verified, you'll be able to:</p>
      <ul>
        <li>Join beach cleanup events in your area</li>
        <li>Track your environmental impact</li>
        <li>Connect with other volunteers</li>
        <li>Earn points and achievements</li>
      </ul>
      <p>If you did not create this account, please disregard this email.</p>
      <p>Together, we can make our coastlines cleaner and healthier!</p>
      <p>Best regards,<br/>The BeachGuardians Team</p>
    </div>
  `;
  return { subject, html };
}

export function getVerificationApprovalTemplate(name: string, eventName: string) {
  const subject = `Your Waste Collection Verification Approved - ${eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Great news, ${name}!</h2>
      <p>Your Google Drive link for waste collection has been reviewed and approved by the event admin.</p>
      <h3>Event: ${eventName}</h3>
      <p>You can now log waste for this event. Simply go to the waste logging form and submit your waste collection details.</p>
      <p>Thank you for your contribution to keeping our coastlines clean!</p>
      <p>Best regards,<br/>The BeachGuardians Team</p>
    </div>
  `;
  return { subject, html };
}