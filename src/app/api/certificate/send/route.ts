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

      // Get waste logs for this user - check both userId and loggedBy fields
      // Note: Firestore doesn't support OR queries, so we need to fetch both and merge
      const wasteLogsByUserId = await db.collection('wasteLogs')
        .where('userId', '==', userId)
        .get();
      
      const wasteLogsByLoggedBy = await db.collection('wasteLogs')
        .where('loggedBy', '==', userId)
        .get();
      
      // Merge and deduplicate waste logs
      const wasteLogMap = new Map<string, number>();
      
      wasteLogsByUserId.forEach((doc) => {
        const logData = doc.data();
        const logId = doc.id;
        const weight = Number(logData?.weightKg || 0);
        if (weight > 0) {
          wasteLogMap.set(logId, weight);
        }
      });
      
      wasteLogsByLoggedBy.forEach((doc) => {
        const logData = doc.data();
        const logId = doc.id;
        const weight = Number(logData?.weightKg || 0);
        // Only add if not already counted (avoid duplicates)
        if (weight > 0 && !wasteLogMap.has(logId)) {
          wasteLogMap.set(logId, weight);
        }
      });
      
      // Calculate total waste
      let totalWaste = 0;
      wasteLogMap.forEach((weight) => {
        totalWaste += weight;
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

    // Draw borders matching the image design
    // Blue borders on top, bottom, and right edges
    // Yellow border on left edge with blue inner line
    const borderWidth = 12;
    const borderColor = rgb(0.1, 0.4, 0.7); // Dark blue
    const yellowBorderColor = rgb(0.95, 0.75, 0.1); // Yellow
    const innerBlueLineColor = rgb(0.1, 0.4, 0.7); // Blue inner line
    
    // White background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(1, 1, 1), // White background
    });

    // Top border (blue)
    page.drawRectangle({
      x: 0,
      y: height - borderWidth,
      width: width,
      height: borderWidth,
      color: borderColor,
    });

    // Bottom border (blue)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: borderWidth,
      color: borderColor,
    });

    // Right border (blue)
    page.drawRectangle({
      x: width - borderWidth,
      y: 0,
      width: borderWidth,
      height: height,
      color: borderColor,
    });

    // Left border (yellow)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: borderWidth,
      height: height,
      color: yellowBorderColor,
    });

    // Blue inner line next to yellow border (thin vertical line)
    const innerLineWidth = 2;
    page.drawRectangle({
      x: borderWidth,
      y: 0,
      width: innerLineWidth,
      height: height,
      color: innerBlueLineColor,
    });

    // Account for borders when positioning content
    const contentPadding = borderWidth + innerLineWidth + 20; // Left padding accounting for yellow border + blue line
    const rightPadding = borderWidth + 20; // Right padding for blue border
    const topPadding = borderWidth + 30; // Top padding for blue border
    const bottomPadding = borderWidth + 20; // Bottom padding for blue border

    // Draw logo (centered, accounting for borders)
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: height - topPadding - 50,
      width: logoDims.width,
      height: logoDims.height,
    });

    // Draw "BeachGuardians" text below logo (matching image)
    page.drawText('BeachGuardians', {
      x: width / 2,
      y: height - topPadding - 65,
      font: bodyFont,
      size: 14,
      color: rgb(0.1, 0.4, 0.7),
      align: 'center',
    });

    // Draw title "Certificate of Appreciation"
    page.drawText('Certificate of Appreciation', {
      x: contentPadding,
      y: height - topPadding - 120,
      font: titleFont,
      size: 36,
      color: rgb(0.1, 0.4, 0.7),
      width: width - contentPadding - rightPadding,
      align: 'center',
    });

    // Draw decorative yellow line under title (shorter, centered)
    page.drawLine({
      start: { x: width / 2 - 100, y: height - topPadding - 145 },
      end: { x: width / 2 + 100, y: height - topPadding - 145 },
      thickness: 2,
      color: rgb(0.95, 0.75, 0.1),
    });

    // Draw "Proudly Presented To"
    page.drawText('Proudly Presented To', {
      x: contentPadding,
      y: height - topPadding - 180,
      font: bodyFont,
      size: 16,
      color: rgb(0.4, 0.4, 0.4),
      width: width - contentPadding - rightPadding,
      align: 'center',
    });

    // Draw volunteer's name (gold color, italic) - matching image
    const nameY = height - topPadding - 240;
    page.drawText(user.fullName, {
      x: contentPadding,
      y: nameY,
      font: scriptFont,
      size: 42,
      color: rgb(0.72, 0.53, 0.04), // Golden brown color matching image
      width: width - contentPadding - rightPadding,
      align: 'center',
    });

    // Draw blue underline under name
    const nameWidth = user.fullName.length * 20;
    const underlineLength = Math.min(nameWidth + 40, 220);
    page.drawLine({
      start: { x: width / 2 - underlineLength / 2, y: height - topPadding - 265 },
      end: { x: width / 2 + underlineLength / 2, y: height - topPadding - 265 },
      thickness: 1.5,
      color: rgb(0.1, 0.4, 0.7),
    });

    // Draw appreciation message (matching image - single line)
    const message = `In recognition of your outstanding dedication and invaluable contributions to protecting our coastlines. Your commitment to environmental conservation has made a significant positive impact on our community and the planet.`;
    page.drawText(message, {
      x: contentPadding + 20,
      y: height - topPadding - 330,
      font: bodyFont,
      size: 13,
      lineHeight: 18,
      color: rgb(0.2, 0.2, 0.2),
      width: width - contentPadding - rightPadding - 40,
      align: 'center',
    });

    // Draw statistics section with background (matching image)
    const statsY = height - topPadding - 425;
    const statsBoxHeight = 180;
    const statsBoxX = contentPadding + 20;
    const statsBoxWidth = width - contentPadding - rightPadding - 40;
    
    // Draw statistics box background with border
    page.drawRectangle({
      x: statsBoxX,
      y: statsY - statsBoxHeight,
      width: statsBoxWidth,
      height: statsBoxHeight,
      borderColor: rgb(0.1, 0.4, 0.7),
      borderWidth: 2,
      color: rgb(0.98, 0.98, 0.98), // Light grey background
    });

    // Draw statistics title
    page.drawText('Your Contribution Statistics', {
      x: statsBoxX,
      y: statsY - 20,
      font: boldFont,
      size: 16,
      color: rgb(0.1, 0.4, 0.7),
      width: statsBoxWidth,
      align: 'center',
    });

    // Draw statistics in a grid layout
    const statsStartY = statsY - 50;
    const statsRowHeight = 35;
    const leftColX = statsBoxX + 40;
    const rightColX = width / 2 + 20;
    const colWidth = (statsBoxWidth - 80) / 2 - 20;

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

    // Draw closing message (matching image)
    const closingMessage = `Thank you for being an exemplary BeachGuardian and inspiring others to join our mission.`;
    page.drawText(closingMessage, {
      x: contentPadding + 20,
      y: statsY - statsBoxHeight - 35,
      font: bodyFont,
      size: 13,
      lineHeight: 18,
      color: rgb(0.25, 0.25, 0.25),
      width: width - contentPadding - rightPadding - 40,
      align: 'center',
    });
    
    // Draw signature section (matching image)
    const signatureY = bottomPadding + 100;
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
    
    // Draw date (bottom left, matching image)
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    page.drawText(`Issued on: ${issueDate}`, {
      x: contentPadding + 20,
      y: bottomPadding + 30,
      font: bodyFont,
      size: 11,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw certificate ID (bottom right, matching image)
    const certId = `CERT-${userId.substring(0, 8).toUpperCase()}-${Date.now().toString().substring(7)}`;
    page.drawText(`Certificate ID: ${certId}`, {
      x: width - rightPadding - 200,
      y: bottomPadding + 30,
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