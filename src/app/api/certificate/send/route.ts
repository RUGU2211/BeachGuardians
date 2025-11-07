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

// Generate certificate ID
function generateCertificateId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    // Use volunteerId as uid if uid is not provided
    const userId = user.uid || user.volunteerId;
    if (!user || !user.email || !user.fullName || !user.points || !userId) {
      return NextResponse.json({ error: 'User data is incomplete' }, { status: 400 });
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
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
<<<<<<< HEAD
      y: height - 60,
=======
      y: height - 90,
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
      width: logoDims.width,
      height: logoDims.height,
    });

<<<<<<< HEAD
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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
      y: statsStartY,
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
<<<<<<< HEAD
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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
<<<<<<< HEAD
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
=======
    page.drawText(`CO2 Saved:`, {
      x: rightColX,
      y: statsStartY - statsRowHeight,
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
      font: bodyFont,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
<<<<<<< HEAD
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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
<<<<<<< HEAD

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
=======
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
>>>>>>> 2d532549c794c85a4c247fbef98c4a5076ca6abd
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