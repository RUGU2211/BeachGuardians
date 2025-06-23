import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// Helper function to format numbers with commas
function formatNumber(num: number) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    if (!user || !user.email || !user.fullName || !user.points) {
      return NextResponse.json({ error: 'User data is incomplete' }, { status: 400 });
    }

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    const { width, height } = page.getSize();

    // Load logo and font
    const logoPath = path.resolve('./public/logo.jpg');
    const logoImageBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedJpg(logoImageBytes);
    const logoDims = logoImage.scale(0.15);
    
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const scriptFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Draw background color
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.96, 0.98, 1), // Light blue background
    });

    // Draw logo
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: height - logoDims.height - 40,
      width: logoDims.width,
      height: logoDims.height,
    });

    // Draw title
    page.drawText('Certificate of Appreciation', {
      x: 50,
      y: height - 180,
      font: titleFont,
      size: 40,
      color: rgb(0.1, 0.3, 0.6),
      width: width - 100,
      align: 'center',
    });

    page.drawText('Proudly Presented To', {
      x: 50,
      y: height - 240,
      font: bodyFont,
      size: 18,
      color: rgb(0.3, 0.3, 0.3),
      width: width - 100,
      align: 'center',
    });

    // Draw volunteer's name
    page.drawText(user.fullName, {
      x: 50,
      y: height - 300,
      font: scriptFont,
      size: 48,
      color: rgb(0.8, 0.6, 0), // Gold color
      width: width - 100,
      align: 'center',
    });

    // Draw appreciation message
    const message = `In recognition of your outstanding dedication and invaluable contributions to protecting our coastlines. Your efforts have made a significant impact, and we are incredibly grateful for your commitment. You have earned a remarkable ${formatNumber(user.points)} points!`;
    page.drawText(message, {
      x: 80,
      y: height - 380,
      font: bodyFont,
      size: 16,
      lineHeight: 24,
      color: rgb(0.2, 0.2, 0.2),
      width: width - 160,
      align: 'center',
    });
    
    // Draw signature line and date
    page.drawLine({
      start: { x: width / 2 - 100, y: 100 },
      end: { x: width / 2 + 100, y: 100 },
      thickness: 1,
      color: rgb(0.1, 0.3, 0.6),
    });
    page.drawText('BeachGuardians Team', {
      x: width / 2 - 100,
      y: 85,
      width: 200,
      font: bodyFont,
      size: 12,
      align: 'center',
    });
     page.drawText(`Issued on: ${new Date().toLocaleDateString('en-US')}`, {
      x: 50,
      y: 50,
      font: bodyFont,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // --- Email Sending ---
    await sendEmail({
      to: user.email,
      subject: `Your BeachGuardians Certificate of Appreciation!`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Congratulations, ${user.fullName}!</h2>
          <p>Thank you for your outstanding contribution to BeachGuardians. We are thrilled to recognize your hard work and dedication.</p>
          <p>Please find your official Certificate of Appreciation attached to this email.</p>
          <p>We look forward to continuing our work together to protect our beautiful coastlines.</p>
          <p>Best regards,<br/>The BeachGuardians Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `BeachGuardians-Certificate-${user.fullName.replace(/\s/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ success: true, message: 'Certificate sent successfully.' });
  } catch (error) {
    console.error('Error sending certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to send certificate: ${errorMessage}` }, { status: 500 });
  }
} 