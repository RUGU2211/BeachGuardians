import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { getOrInitializeAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Helper function to format numbers with commas
function formatNumber(num: number) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    // Use volunteerId as uid if uid is not provided
    const userId = user.uid || user.volunteerId;
    if (!user || !user.email || !user.fullName || !user.points || !userId) {
      return NextResponse.json({ error: 'User data is incomplete' }, { status: 400 });
    }

    // Fetch additional user statistics from Firestore
    let userStats = {
      eventsAttended: user.eventsAttended?.length || 0,
      wasteCollected: 0,
      badgesEarned: Array.isArray(user.badges) ? user.badges.length : (user.badgesCount || 0),
      co2Saved: 0,
      treesSaved: 0,
    };

    try {
      const adminApp = getOrInitializeAdminApp();
      const db = admin.firestore(adminApp);
      
      // Get user document
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userStats.eventsAttended = userData?.eventsAttended?.length || 0;
        userStats.badgesEarned = Array.isArray(userData?.badges) 
          ? userData.badges.length 
          : (userData?.badgesCount || 0);
      }

      // Get waste logs for this user
      const wasteLogsSnapshot = await db.collection('wasteLogs')
        .where('userId', '==', userId)
        .get();
      
      let totalWaste = 0;
      wasteLogsSnapshot.forEach((doc) => {
        const logData = doc.data();
        totalWaste += Number(logData?.weightKg || 0);
      });
      userStats.wasteCollected = totalWaste;

      // Calculate environmental impact
      userStats.co2Saved = Math.round(totalWaste * 1.7);
      userStats.treesSaved = Math.round((totalWaste * 1.7) / 22);
    } catch (statsError) {
      console.warn('Could not fetch additional stats, using provided data:', statsError);
    }

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait for better certificate layout
    const { width, height } = page.getSize();

    // Load logo and fonts
    const logoPath = path.resolve('./public/logo.jpg');
    const logoImageBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedJpg(logoImageBytes);
    const logoDims = logoImage.scale(0.12);
    
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const scriptFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw decorative border
    const borderWidth = 8;
    const borderColor = rgb(0.1, 0.4, 0.7);
    const innerBorderColor = rgb(0.9, 0.7, 0.1);
    
    // Outer border
    page.drawRectangle({
      x: borderWidth,
      y: borderWidth,
      width: width - borderWidth * 2,
      height: height - borderWidth * 2,
      borderColor: borderColor,
      borderWidth: borderWidth,
    });

    // Inner decorative border
    page.drawRectangle({
      x: borderWidth * 2,
      y: borderWidth * 2,
      width: width - borderWidth * 4,
      height: height - borderWidth * 4,
      borderColor: innerBorderColor,
      borderWidth: 2,
    });

    // Draw gradient-like background
    page.drawRectangle({
      x: borderWidth * 2,
      y: borderWidth * 2,
      width: width - borderWidth * 4,
      height: height - borderWidth * 4,
      color: rgb(0.97, 0.98, 1), // Very light blue background
    });

    // Draw decorative corner elements (aligned with inner border)
    const cornerSize = 35;
    const cornerThickness = 3;
    const cornerOffset = borderWidth * 2 + 15; // Align with inner border
    
    // Top-left corner
    page.drawLine({
      start: { x: cornerOffset, y: height - cornerOffset },
      end: { x: cornerOffset + cornerSize, y: height - cornerOffset },
      thickness: cornerThickness,
      color: borderColor,
    });
    page.drawLine({
      start: { x: cornerOffset, y: height - cornerOffset },
      end: { x: cornerOffset, y: height - cornerOffset - cornerSize },
      thickness: cornerThickness,
      color: borderColor,
    });
    // Top-right corner
    page.drawLine({
      start: { x: width - cornerOffset, y: height - cornerOffset },
      end: { x: width - cornerOffset - cornerSize, y: height - cornerOffset },
      thickness: cornerThickness,
      color: borderColor,
    });
    page.drawLine({
      start: { x: width - cornerOffset, y: height - cornerOffset },
      end: { x: width - cornerOffset, y: height - cornerOffset - cornerSize },
      thickness: cornerThickness,
      color: borderColor,
    });
    // Bottom-left corner
    page.drawLine({
      start: { x: cornerOffset, y: cornerOffset },
      end: { x: cornerOffset + cornerSize, y: cornerOffset },
      thickness: cornerThickness,
      color: borderColor,
    });
    page.drawLine({
      start: { x: cornerOffset, y: cornerOffset },
      end: { x: cornerOffset, y: cornerOffset + cornerSize },
      thickness: cornerThickness,
      color: borderColor,
    });
    // Bottom-right corner
    page.drawLine({
      start: { x: width - cornerOffset, y: cornerOffset },
      end: { x: width - cornerOffset - cornerSize, y: cornerOffset },
      thickness: cornerThickness,
      color: borderColor,
    });
    page.drawLine({
      start: { x: width - cornerOffset, y: cornerOffset },
      end: { x: width - cornerOffset, y: cornerOffset + cornerSize },
      thickness: cornerThickness,
      color: borderColor,
    });

    // Draw logo
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: height - 90,
      width: logoDims.width,
      height: logoDims.height,
    });

    // Draw title with better styling
    page.drawText('Certificate of Appreciation', {
      x: 50,
      y: height - 170,
      font: titleFont,
      size: 36,
      color: rgb(0.1, 0.4, 0.7),
      width: width - 100,
      align: 'center',
    });

    // Draw decorative line under title (shorter, centered)
    page.drawLine({
      start: { x: width / 2 - 100, y: height - 195 },
      end: { x: width / 2 + 100, y: height - 195 },
      thickness: 2,
      color: rgb(0.9, 0.7, 0.1),
    });

    page.drawText('Proudly Presented To', {
      x: 50,
      y: height - 230,
      font: bodyFont,
      size: 16,
      color: rgb(0.4, 0.4, 0.4),
      width: width - 100,
      align: 'center',
    });

    // Draw volunteer's name with better styling
    const nameY = height - 290;
    page.drawText(user.fullName, {
      x: 50,
      y: nameY,
      font: scriptFont,
      size: 42,
      color: rgb(0.85, 0.65, 0.1), // Rich gold color
      width: width - 100,
      align: 'center',
    });

    // Calculate name width for underline (approximate based on font size)
    const nameWidth = user.fullName.length * 20; // Approximate character width
    const underlineLength = Math.min(nameWidth + 40, 220); // Max 220, min based on name
    
    // Draw decorative line under name (proportional to name width)
    page.drawLine({
      start: { x: width / 2 - underlineLength / 2, y: height - 315 },
      end: { x: width / 2 + underlineLength / 2, y: height - 315 },
      thickness: 1.5,
      color: rgb(0.1, 0.4, 0.7),
    });

    // Draw appreciation message (split into two lines for better readability)
    const message1 = `In recognition of your outstanding dedication and invaluable contributions to protecting our coastlines.`;
    const message2 = `Your commitment to environmental conservation has made a significant positive impact on our community and the planet.`;
    
    page.drawText(message1, {
      x: 70,
      y: height - 385,
      font: bodyFont,
      size: 13,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
      width: width - 140,
      align: 'center',
    });
    
    page.drawText(message2, {
      x: 70,
      y: height - 410,
      font: bodyFont,
      size: 13,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
      width: width - 140,
      align: 'center',
    });

    // Draw statistics section with background
    const statsY = height - 480;
    const statsBoxHeight = 180;
    
    // Draw statistics box background
    page.drawRectangle({
      x: 70,
      y: statsY - statsBoxHeight,
      width: width - 140,
      height: statsBoxHeight,
      color: rgb(0.95, 0.97, 1),
      borderColor: rgb(0.1, 0.4, 0.7),
      borderWidth: 2,
    });

    // Draw statistics title
    page.drawText('Your Contribution Statistics', {
      x: 70,
      y: statsY - 20,
      font: boldFont,
      size: 16,
      color: rgb(0.1, 0.4, 0.7),
      width: width - 140,
      align: 'center',
    });

    // Draw statistics in a grid layout
    const statsStartY = statsY - 50;
    const statsRowHeight = 35;
    const leftColX = 110;
    const rightColX = width / 2 + 40;
    const colWidth = (width - 220) / 2 - 40;

    // Left column - Labels
    page.drawText(`Events Attended:`, {
      x: leftColX,
      y: statsStartY,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`Waste Collected:`, {
      x: leftColX,
      y: statsStartY - statsRowHeight,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`Points Earned:`, {
      x: leftColX,
      y: statsStartY - statsRowHeight * 2,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Left column - Values (right-aligned within column)
    const leftValueX = leftColX + colWidth - 20;
    page.drawText(`${userStats.eventsAttended}`, {
      x: leftValueX,
      y: statsStartY - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });
    page.drawText(`${formatNumber(userStats.wasteCollected.toFixed(1))} kg`, {
      x: leftValueX,
      y: statsStartY - statsRowHeight - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });
    page.drawText(`${formatNumber(user.points)}`, {
      x: leftValueX,
      y: statsStartY - statsRowHeight * 2 - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });

    // Right column - Labels
    page.drawText(`Badges Earned:`, {
      x: rightColX,
      y: statsStartY,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`CO2 Saved:`, {
      x: rightColX,
      y: statsStartY - statsRowHeight,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`Trees Saved:`, {
      x: rightColX,
      y: statsStartY - statsRowHeight * 2,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Right column - Values (right-aligned within column)
    const rightValueX = rightColX + colWidth - 20;
    page.drawText(`${userStats.badgesEarned}`, {
      x: rightValueX,
      y: statsStartY - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });
    page.drawText(`${formatNumber(userStats.co2Saved)} kg`, {
      x: rightValueX,
      y: statsStartY - statsRowHeight - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });
    page.drawText(`${userStats.treesSaved}`, {
      x: rightValueX,
      y: statsStartY - statsRowHeight * 2 - 18,
      font: boldFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      width: 100,
      align: 'right',
    });

    // Draw closing message (split to prevent truncation)
    const closingMessage = `Thank you for being an exemplary BeachGuardian and inspiring others to join our mission.`;
    page.drawText(closingMessage, {
      x: 70,
      y: statsY - statsBoxHeight - 35,
      font: bodyFont,
      size: 13,
      lineHeight: 18,
      color: rgb(0.25, 0.25, 0.25),
      width: width - 140,
      align: 'center',
    });
    
    // Draw signature section
    const signatureY = 140;
    page.drawLine({
      start: { x: width / 2 - 110, y: signatureY },
      end: { x: width / 2 + 110, y: signatureY },
      thickness: 1.5,
      color: rgb(0.1, 0.4, 0.7),
    });
    page.drawText('BeachGuardians Team', {
      x: width / 2 - 110,
      y: signatureY - 20,
      width: 220,
      font: boldFont,
      size: 14,
      align: 'center',
      color: rgb(0.1, 0.4, 0.7),
    });
    
    // Draw date
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    page.drawText(`Issued on: ${issueDate}`, {
      x: 60,
      y: 80,
      font: bodyFont,
      size: 11,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw certificate ID
    const certId = `CERT-${userId.substring(0, 8).toUpperCase()}-${Date.now().toString().substring(7)}`;
    page.drawText(`Certificate ID: ${certId}`, {
      x: width - 260,
      y: 80,
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