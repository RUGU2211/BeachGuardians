// This file contains client-side only code for sending emails via the API route.

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
  }
  
  export const sendEmailFromClient = async (options: EmailOptions) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
  
      console.log(`Email request sent for ${options.to}`);
      return await response.json();
    } catch (error) {
      console.error('Error sending email from client:', error);
      throw error;
    }
  }; 