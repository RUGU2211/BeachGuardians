import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// Helper function to format numbers with commas
function formatNumber(num: number) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

// Generate certificate ID
function generateCertificateId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    if (!user || !user.email || !user.fullName || !user.points) {
      return NextResponse.json({ error: 'User data is incomplete' }, { status: 400 });
    }

    // Calculate additional stats
    const eventsAttended = user.eventsAttended?.length || 0;
    const wasteCollected = user.wasteCollected || 0;
    const pointsEarned = user.points || 0;
    const badgesEarned = Array.isArray(user.badges) ? user.badges.length : (user.badgesCount || 0);
    // CO2 saved: 1kg waste -> 1.7kg CO2e
    const co2Saved = Math.round(wasteCollected * 1.7);
    // Trees saved: 1 tree absorbs ~22kg CO2 per year, so CO2 saved / 22
    const treesSaved = Math.round(co2Saved / 22);

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape (horizontal)
    const { width, height } = page.getSize();

    // Load logo and fonts
    const logoPath = path.resolve('./public/logo.jpg');
    const logoImageBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedJpg(logoImageBytes);
    const logoDims = logoImage.scale(0.12);
    
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const scriptFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Draw decorative border
    const borderThickness = 8;
    const borderColor = rgb(0.1, 0.3, 0.6); // Dark blue
    const yellowAccent = rgb(1, 0.84, 0); // Yellow
    
    // Outer border
    page.drawRectangle({
      x: borderThickness,
      y: borderThickness,
      width: width - (borderThickness * 2),
      height: height - (borderThickness * 2),
      borderColor: borderColor,
      borderWidth: borderThickness,
      color: rgb(0.96, 0.98, 1), // Light blue background
    });

    // Yellow accent line on left
    page.drawRectangle({
      x: borderThickness * 2,
      y: borderThickness * 2,
      width: 4,
      height: height - (borderThickness * 4),
      color: yellowAccent,
    });

    // Blue accent line on right
    page.drawRectangle({
      x: width - (borderThickness * 2) - 4,
      y: borderThickness * 2,
      width: 4,
      height: height - (borderThickness * 4),
      color: borderColor,
    });

    // Corner decorations (L-shaped)
    const cornerSize = 30;
    // Top-left corner
    page.drawLine({
      start: { x: borderThickness * 2, y: height - (borderThickness * 2) },
      end: { x: borderThickness * 2 + cornerSize, y: height - (borderThickness * 2) },
      thickness: 3,
      color: borderColor,
    });
    page.drawLine({
      start: { x: borderThickness * 2, y: height - (borderThickness * 2) },
      end: { x: borderThickness * 2, y: height - (borderThickness * 2) - cornerSize },
      thickness: 3,
      color: borderColor,
    });

    // Bottom-right corner
    page.drawLine({
      start: { x: width - (borderThickness * 2), y: borderThickness * 2 },
      end: { x: width - (borderThickness * 2) - cornerSize, y: borderThickness * 2 },
      thickness: 3,
      color: borderColor,
    });
    page.drawLine({
      start: { x: width - (borderThickness * 2), y: borderThickness * 2 },
      end: { x: width - (borderThickness * 2), y: borderThickness * 2 + cornerSize },
      thickness: 3,
      color: borderColor,
    });

    // Draw logo
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: height - 60,
      width: logoDims.width,
      height: logoDims.height,
    });

    // Draw "BeachGuardians" text below logo
    const beachGuardiansText = 'BeachGuardians';
    const beachGuardiansWidth = titleFont.widthOfTextAtSize(beachGuardiansText, 24);
    page.drawText(beachGuardiansText, {
      x: (width - beachGuardiansWidth) / 2,
      y: height - 100,
      font: titleFont,
      size: 24,
      color: borderColor,
    });

    // Draw title "Certificate of Appreciation"
    const titleText = 'Certificate of Appreciation';
    const titleWidth = titleFont.widthOfTextAtSize(titleText, 36);
    page.drawText(titleText, {
      x: (width - titleWidth) / 2,
      y: height - 150,
      font: titleFont,
      size: 36,
      color: borderColor,
    });

    // Yellow underline for title
    page.drawLine({
      start: { x: width / 2 - 150, y: height - 165 },
      end: { x: width / 2 + 150, y: height - 165 },
      thickness: 2,
      color: yellowAccent,
    });

    // Draw "Proudly Presented To"
    const presentedText = 'Proudly Presented To';
    const presentedWidth = bodyFont.widthOfTextAtSize(presentedText, 16);
    page.drawText(presentedText, {
      x: (width - presentedWidth) / 2,
      y: height - 200,
      font: bodyFont,
      size: 16,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw volunteer's name
    const nameWidth = scriptFont.widthOfTextAtSize(user.fullName, 42);
    page.drawText(user.fullName, {
      x: (width - nameWidth) / 2,
      y: height - 250,
      font: scriptFont,
      size: 42,
      color: rgb(0.85, 0.65, 0.13), // Gold color
    });

    // Blue underline for name
    page.drawLine({
      start: { x: width / 2 - 120, y: height - 265 },
      end: { x: width / 2 + 120, y: height - 265 },
      thickness: 2,
      color: borderColor,
    });

    // Draw appreciation message
    const message = `In recognition of your outstanding dedication and invaluable contributions to protecting our environment. Your commitment to environmental conservation has made a significant positive impact on our mission.`;
    // Split message into lines for better formatting
    const messageLines = message.match(/.{1,80}(\s|$)/g) || [message];
    const messageStartY = height - 320;
    messageLines.forEach((line, index) => {
      const lineWidth = bodyFont.widthOfTextAtSize(line.trim(), 14);
      page.drawText(line.trim(), {
        x: (width - lineWidth) / 2,
        y: messageStartY - (index * 20),
        font: bodyFont,
        size: 14,
        color: rgb(0.3, 0.3, 0.3),
      });
    });

    // Draw statistics box
    const statsBoxY = height - 420;
    const statsBoxHeight = 120;
    const statsBoxX = width / 2 - 300;
    const statsBoxWidth = 600;

    // Box background
    page.drawRectangle({
      x: statsBoxX,
      y: statsBoxY,
      width: statsBoxWidth,
      height: statsBoxHeight,
      borderColor: borderColor,
      borderWidth: 2,
      color: rgb(0.98, 0.99, 1),
    });

    // Box title
    const statsTitleText = 'Your Contribution Statistics';
    const statsTitleWidth = titleFont.widthOfTextAtSize(statsTitleText, 16);
    page.drawText(statsTitleText, {
      x: statsBoxX + (statsBoxWidth - statsTitleWidth) / 2,
      y: statsBoxY + statsBoxHeight - 20,
      font: titleFont,
      size: 16,
      color: borderColor,
    });

    // Statistics in two columns
    const statsLeftX = statsBoxX + 40;
    const statsRightX = statsBoxX + statsBoxWidth / 2 + 20;
    const statsStartY = statsBoxY + statsBoxHeight - 50;
    const statsLineHeight = 18;

    // Left column
    page.drawText('Events Attended:', {
      x: statsLeftX,
      y: statsStartY,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(eventsAttended)}`, {
      x: statsLeftX + 120,
      y: statsStartY,
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    page.drawText('Waste Collected:', {
      x: statsLeftX,
      y: statsStartY - statsLineHeight,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(wasteCollected.toFixed(1))} kg`, {
      x: statsLeftX + 120,
      y: statsStartY - statsLineHeight,
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    page.drawText('Points Earned:', {
      x: statsLeftX,
      y: statsStartY - (statsLineHeight * 2),
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(pointsEarned)}`, {
      x: statsLeftX + 120,
      y: statsStartY - (statsLineHeight * 2),
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    // Right column
    page.drawText('Badges Earned:', {
      x: statsRightX,
      y: statsStartY,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(badgesEarned)}`, {
      x: statsRightX + 120,
      y: statsStartY,
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    page.drawText('CO2 Saved:', {
      x: statsRightX,
      y: statsStartY - statsLineHeight,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(co2Saved)} kg`, {
      x: statsRightX + 120,
      y: statsStartY - statsLineHeight,
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    page.drawText('Trees Saved:', {
      x: statsRightX,
      y: statsStartY - (statsLineHeight * 2),
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${formatNumber(treesSaved)}`, {
      x: statsRightX + 120,
      y: statsStartY - (statsLineHeight * 2),
      font: titleFont,
      size: 12,
      color: borderColor,
    });

    // Closing statement
    const closingText = 'Thank you for being an exemplary BeachGuardian and inspiring others to join our mission';
    const closingWidth = bodyFont.widthOfTextAtSize(closingText, 13);
    page.drawText(closingText, {
      x: (width - closingWidth) / 2,
      y: statsBoxY - 30,
      font: bodyFont,
      size: 13,
      color: rgb(0.3, 0.3, 0.3),
    });

    // BeachGuardians Team signature
    const signatureText = 'BeachGuardians Team';
    const signatureWidth = bodyFont.widthOfTextAtSize(signatureText, 14);
    page.drawText(signatureText, {
      x: (width - signatureWidth) / 2,
      y: statsBoxY - 60,
      font: bodyFont,
      size: 14,
      color: borderColor,
    });

    // Underline for signature
    page.drawLine({
      start: { x: width / 2 - 80, y: statsBoxY - 70 },
      end: { x: width / 2 + 80, y: statsBoxY - 70 },
      thickness: 1,
      color: borderColor,
    });

    // Certificate ID and date
    const certificateId = generateCertificateId();
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    page.drawText(`Issued on: ${issueDate}`, {
      x: 60,
      y: 40,
      font: bodyFont,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Certificate ID: ${certificateId}`, {
      x: width - 250,
      y: 40,
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