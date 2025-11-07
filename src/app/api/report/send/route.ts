import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Helper function to format numbers with commas
function formatNumber(num: number) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

interface ImpactReportData {
  totalEvents: number;
  totalVolunteers: number;
  activeVolunteers: number;
  totalWasteCollected: number;
  upcomingEvents: number;
  completedEvents: number;
  wasteByMonth: { month: string; amount: number }[];
  topVolunteers: Array<{
    fullName: string;
    points: number;
    totalWasteContributed?: number;
    eventsCount?: number;
  }>;
  environmentalImpact: {
    co2Saved: number;
    treesSaved: number;
    oceanLifeSaved: number;
    plasticBottlesRecycled: number;
    landfillSpaceSaved: number;
    energySaved: number;
  };
  recipientEmail?: string;
}

export async function POST(req: Request) {
  try {
    const data: ImpactReportData = await req.json();
    
    if (!data) {
      return NextResponse.json({ error: 'Report data is incomplete' }, { status: 400 });
    }

    const recipientEmail = data.recipientEmail;
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Ensure all numeric values are valid
    const totalWasteCollected = Number(data.totalWasteCollected) || 0;
    const totalEvents = Number(data.totalEvents) || 0;
    const totalVolunteers = Number(data.totalVolunteers) || 0;
    const activeVolunteers = Number(data.activeVolunteers) || 0;
    const upcomingEvents = Number(data.upcomingEvents) || 0;
    const completedEvents = Number(data.completedEvents) || 0;
    const impact = data.environmentalImpact;

    // --- PDF Generation (matching the image design) ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
    const { width, height } = page.getSize();

    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Color scheme matching the image
    const primaryColor = rgb(0.1, 0.3, 0.6); // Dark blue for header
    const textColor = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const borderColor = rgb(0.8, 0.8, 0.8);

    // Header section with blue background (matching image)
    const headerHeight = 80;
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width: width,
      height: headerHeight,
      color: primaryColor,
    });

    // Title in white on blue background
    const reportTitle = 'BeachGuardians Impact Report';
    page.drawText(reportTitle, {
      x: width / 2,
      y: height - 35,
      font: titleFont,
      size: 28,
      color: rgb(1, 1, 1),
      align: 'center',
    });

    // Generation date in white
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    page.drawText(`Generated: ${generatedDate}`, {
      x: width / 2,
      y: height - 60,
      font: bodyFont,
      size: 12,
      color: rgb(1, 1, 1),
      align: 'center',
    });

    let currentY = height - headerHeight - 30;

    // Key Metrics Section
    page.drawText('Key Metrics', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    // Key metrics grid (matching image layout - 2 rows of 3)
    const metrics = [
      { label: 'Total Events', value: formatNumber(totalEvents) },
      { label: 'Total Volunteers', value: formatNumber(totalVolunteers) },
      { label: 'Active Volunteers', value: formatNumber(activeVolunteers) },
      { label: 'Total Waste Collected', value: `${formatNumber(totalWasteCollected.toFixed(1))} kg` },
      { label: 'Upcoming Events', value: formatNumber(upcomingEvents) },
      { label: 'Completed Events', value: formatNumber(completedEvents) },
    ];

    const metricsPerRow = 3;
    const metricBoxWidth = (width - 120) / metricsPerRow;
    const metricBoxHeight = 60;
    let metricIndex = 0;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < metricsPerRow; col++) {
        if (metricIndex >= metrics.length) break;
        const metric = metrics[metricIndex];
        const boxX = 50 + col * (metricBoxWidth + 10);
        const boxY = currentY - row * (metricBoxHeight + 10);

        // Box background (light gray)
        page.drawRectangle({
          x: boxX,
          y: boxY - metricBoxHeight,
          width: metricBoxWidth,
          height: metricBoxHeight,
          borderColor: borderColor,
          borderWidth: 1,
          color: lightGray,
        });

        // Metric value (blue and bold for "Total Waste Collected")
        const isWasteMetric = metric.label === 'Total Waste Collected';
        page.drawText(metric.value, {
          x: boxX + 10,
          y: boxY - 25,
          font: titleFont,
          size: isWasteMetric ? 16 : 18,
          color: isWasteMetric ? primaryColor : primaryColor,
        });

        // Metric label
        page.drawText(metric.label, {
          x: boxX + 10,
          y: boxY - 50,
          font: bodyFont,
          size: 10,
          color: textColor,
        });

        metricIndex++;
      }
    }

    currentY -= 150;

    // Environmental Impact Section
    page.drawText('Environmental Impact', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    // Table with blue header (matching image)
    const tableX = 50;
    const tableWidth = width - 100;
    const rowHeight = 30;
    const col1Width = tableWidth * 0.6;
    const col2Width = tableWidth * 0.4;

    // Header row with blue background
    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: primaryColor,
    });

    // Header text in white
    page.drawText('Metric', {
      x: tableX + 10,
      y: currentY - 20,
      font: headerFont,
      size: 12,
      color: rgb(1, 1, 1),
    });

    page.drawText('Value', {
      x: tableX + col1Width + 10,
      y: currentY - 20,
      font: headerFont,
      size: 12,
      color: rgb(1, 1, 1),
    });

    currentY -= rowHeight;

    // Environmental impact data rows (alternating gray/white)
    const envMetrics = [
      { label: 'CO2 Saved', value: `${formatNumber(impact.co2Saved)} kg CO2e` },
      { label: 'Trees Saved', value: `${formatNumber(impact.treesSaved)} trees` },
      { label: 'Ocean Life Saved', value: `${formatNumber(impact.oceanLifeSaved)} marine animals` },
      { label: 'Plastic Bottles Recycled', value: `${formatNumber(impact.plasticBottlesRecycled)} bottles` },
      { label: 'Landfill Space Saved', value: `${impact.landfillSpaceSaved.toFixed(2)} m³` },
      { label: 'Energy Saved', value: `${formatNumber(impact.energySaved)} kWh` },
    ];

    envMetrics.forEach((metric, index) => {
      const rowY = currentY - (index * rowHeight);

      // Alternate row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableX,
          y: rowY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      // Metric label
      page.drawText(metric.label, {
        x: tableX + 10,
        y: rowY - 20,
        font: bodyFont,
        size: 11,
        color: textColor,
      });

      // Metric value
      page.drawText(metric.value, {
        x: tableX + col1Width + 10,
        y: rowY - 20,
        font: bodyFont,
        size: 11,
        color: primaryColor,
      });
    });

    currentY -= (envMetrics.length * rowHeight) + 20;

    // Waste Collection Trends Section
    if (data.wasteByMonth && data.wasteByMonth.length > 0) {
      page.drawText('Waste Collection Trends', {
        x: 50,
        y: currentY,
        font: headerFont,
        size: 20,
        color: primaryColor,
      });
      currentY -= 30;

      data.wasteByMonth.forEach((item) => {
        const amount = Number(item.amount) || 0;
        page.drawText(`${item.month}: ${formatNumber(amount.toFixed(1))} kg`, {
          x: 50,
          y: currentY,
          font: bodyFont,
          size: 11,
          color: textColor,
        });
        currentY -= 25;
      });
      currentY -= 10;
    }

    // Top Performing Volunteers Section
    if (data.topVolunteers && data.topVolunteers.length > 0) {
      page.drawText('Top Performing Volunteers', {
        x: 50,
        y: currentY,
        font: headerFont,
        size: 20,
        color: primaryColor,
      });
      currentY -= 30;

      data.topVolunteers.forEach((volunteer, index) => {
        if (currentY < 100) {
          // Add new page if running out of space
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          currentY = height - 50;
        }

        const volunteerName = volunteer.fullName || 'Unknown Volunteer';
        const points = Number(volunteer.points) || 0;
        const waste = Number(volunteer.totalWasteContributed) || 0;
        const events = Number(volunteer.eventsCount) || 0;

        page.drawText(`${index + 1}. ${volunteerName}`, {
          x: 50,
          y: currentY,
          font: headerFont,
          size: 12,
          color: textColor,
        });
        currentY -= 15;

        page.drawText(`   Points: ${formatNumber(points)} | Waste: ${formatNumber(waste.toFixed(1))} kg | Events: ${events}`, {
          x: 55,
          y: currentY,
          font: bodyFont,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
        currentY -= 25;
      });
    }

    // Footer on all pages
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const currentPage = pdfDoc.getPage(i);
      const { height: pageHeight } = currentPage.getSize();

      // Footer line
      currentPage.drawLine({
        start: { x: 50, y: 50 },
        end: { x: width - 50, y: 50 },
        thickness: 1,
        color: borderColor,
      });

      // Footer text
      currentPage.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: width / 2,
        y: 35,
        font: bodyFont,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
        align: 'center',
      });

      currentPage.drawText('BeachGuardians - Protecting Our Coastlines', {
        x: width / 2,
        y: 20,
        font: bodyFont,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
        align: 'center',
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // --- Email Sending ---
    await sendEmail({
      to: recipientEmail,
      subject: `BeachGuardians Impact Report - ${generatedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #1a4d7a;">BeachGuardians Impact Report</h2>
          <p>Dear Administrator,</p>
          <p>Please find attached your BeachGuardians Impact Report generated on ${generatedDate}.</p>
          
          <h3 style="color: #1a4d7a; margin-top: 30px;">Report Summary</h3>
          <ul style="line-height: 2;">
            <li><strong>Total Events:</strong> ${formatNumber(totalEvents)}</li>
            <li><strong>Total Volunteers:</strong> ${formatNumber(totalVolunteers)}</li>
            <li><strong>Active Volunteers:</strong> ${formatNumber(activeVolunteers)}</li>
            <li><strong>Total Waste Collected:</strong> ${formatNumber(totalWasteCollected.toFixed(1))} kg</li>
            <li><strong>CO₂ Saved:</strong> ${formatNumber(impact.co2Saved)} kg CO₂e</li>
            <li><strong>Trees Saved:</strong> ${formatNumber(impact.treesSaved)} trees</li>
          </ul>
          
          <p style="margin-top: 30px;">The detailed report is attached as a PDF document.</p>
          <p>Thank you for your continued dedication to protecting our coastlines.</p>
          
          <p style="margin-top: 30px;">Best regards,<br/>
          <strong>The BeachGuardians Team</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: `beachguardians-impact-report-${generatedDate.replace(/\//g, '-')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Impact report sent successfully via email.' 
    });
  } catch (error) {
    console.error('Error sending impact report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: `Failed to send impact report: ${errorMessage}` 
    }, { status: 500 });
  }
}
