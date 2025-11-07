import { NextResponse } from 'next/server';
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
}

export async function POST(req: Request) {
  try {
    const data: ImpactReportData = await req.json();
    
    if (!data) {
      return NextResponse.json({ error: 'Report data is incomplete' }, { status: 400 });
    }

    // Ensure all numeric values are valid
    const totalWasteCollected = Number(data.totalWasteCollected) || 0;
    const totalEvents = Number(data.totalEvents) || 0;
    const totalVolunteers = Number(data.totalVolunteers) || 0;
    const activeVolunteers = Number(data.activeVolunteers) || 0;
    const upcomingEvents = Number(data.upcomingEvents) || 0;
    const completedEvents = Number(data.completedEvents) || 0;

    // Calculate environmental impact metrics
    // CO2 saved: 1kg waste -> 1.7kg CO2e
    const co2Saved = Math.round(totalWasteCollected * 1.7);
    // Trees saved: 1 tree absorbs ~22kg CO2 per year
    const treesSaved = Math.round(co2Saved / 22) || 0;
    // Ocean life saved: approximate 10 marine animals per kg of waste prevented
    const oceanLifeSaved = Math.round(totalWasteCollected * 10);
    // Plastic bottles recycled: approximate 33 bottles per kg
    const plasticBottlesRecycled = Math.round(totalWasteCollected * 33);
    // Landfill space saved: approximate 0.001 m3 per kg
    const landfillSpaceSaved = (totalWasteCollected * 0.001).toFixed(2);
    // Energy saved: approximate 2.5 kWh per kg
    const energySaved = Math.round(totalWasteCollected * 2.5);

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
    const { width, height } = page.getSize();

    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Color scheme
    const primaryColor = rgb(0.1, 0.3, 0.6); // Dark blue
    const secondaryColor = rgb(0.2, 0.5, 0.8); // Medium blue
    const accentColor = rgb(0.05, 0.7, 0.5); // Green
    const textColor = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const borderColor = rgb(0.7, 0.7, 0.7);

    // Header section
    const headerY = height - 50;
    page.drawRectangle({
      x: 0,
      y: headerY - 60,
      width: width,
      height: 60,
      color: primaryColor,
    });

    // Title
    const reportTitle = 'BeachGuardians Impact Report';
    const reportTitleWidth = titleFont.widthOfTextAtSize(reportTitle, 28);
    page.drawText(reportTitle, {
      x: (width - reportTitleWidth) / 2,
      y: headerY - 25,
      font: titleFont,
      size: 28,
      color: rgb(1, 1, 1),
    });

    // Generation date
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const dateText = `Generated: ${generatedDate}`;
    const dateTextWidth = bodyFont.widthOfTextAtSize(dateText, 12);
    page.drawText(dateText, {
      x: (width - dateTextWidth) / 2,
      y: headerY - 50,
      font: bodyFont,
      size: 12,
      color: rgb(0.9, 0.9, 0.9),
    });

    let currentY = headerY - 100;

    // Key Metrics Section
    page.drawText('Key Metrics', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    // Key metrics grid
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
    const metricBoxHeight = 50;
    let metricIndex = 0;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < metricsPerRow; col++) {
        if (metricIndex >= metrics.length) break;
        const metric = metrics[metricIndex];
        const boxX = 50 + col * (metricBoxWidth + 10);
        const boxY = currentY - row * (metricBoxHeight + 10);

        // Box background
        page.drawRectangle({
          x: boxX,
          y: boxY - metricBoxHeight,
          width: metricBoxWidth,
          height: metricBoxHeight,
          borderColor: borderColor,
          borderWidth: 1,
          color: lightGray,
        });

        // Metric value
        page.drawText(metric.value, {
          x: boxX + 10,
          y: boxY - 25,
          font: titleFont,
          size: 18,
          color: primaryColor,
        });

        // Metric label
        page.drawText(metric.label, {
          x: boxX + 10,
          y: boxY - 45,
          font: bodyFont,
          size: 10,
          color: textColor,
        });

        metricIndex++;
      }
    }

    currentY -= 130;

    // Environmental Impact Section
    page.drawText('Environmental Impact', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    // Table header
    const tableX = 50;
    const tableWidth = width - 100;
    const rowHeight = 25;
    const col1Width = tableWidth * 0.6;
    const col2Width = tableWidth * 0.4;

    // Header row background
    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: secondaryColor,
    });

    // Header text
    page.drawText('Metric', {
      x: tableX + 10,
      y: currentY - 18,
      font: headerFont,
      size: 12,
      color: rgb(1, 1, 1),
    });

    page.drawText('Value', {
      x: tableX + col1Width + 10,
      y: currentY - 18,
      font: headerFont,
      size: 12,
      color: rgb(1, 1, 1),
    });

    // Header separator line
    page.drawLine({
      start: { x: tableX, y: currentY - rowHeight },
      end: { x: tableX + tableWidth, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(1, 1, 1),
    });

    currentY -= rowHeight;

    // Environmental impact data
    const envMetrics = [
      { label: 'CO2 Saved', value: `${formatNumber(co2Saved)} kg CO2e` },
      { label: 'Trees Saved', value: `${formatNumber(treesSaved)} trees` },
      { label: 'Ocean Life Saved', value: `${formatNumber(oceanLifeSaved)} marine animals` },
      { label: 'Plastic Bottles Recycled', value: `${formatNumber(plasticBottlesRecycled)} bottles` },
      { label: 'Landfill Space Saved', value: `${landfillSpaceSaved} m3` },
      { label: 'Energy Saved', value: `${formatNumber(energySaved)} kWh` },
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
        y: rowY - 18,
        font: bodyFont,
        size: 11,
        color: textColor,
      });

      // Metric value
      page.drawText(metric.value, {
        x: tableX + col1Width + 10,
        y: rowY - 18,
        font: bodyFont,
        size: 11,
        color: primaryColor,
      });

      // Row separator
      page.drawLine({
        start: { x: tableX, y: rowY - rowHeight },
        end: { x: tableX + tableWidth, y: rowY - rowHeight },
        thickness: 0.5,
        color: borderColor,
      });
    });

    currentY -= (envMetrics.length * rowHeight) + 20;

    // Waste Collection Trends Section
    page.drawText('Waste Collection Trends', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    const wasteByMonth = data.wasteByMonth || [];
    if (wasteByMonth.length > 0) {
      wasteByMonth.forEach((item, index) => {
        const trendY = currentY - (index * 25);
        const amount = Number(item.amount) || 0;
        page.drawText(`${item.month || 'Unknown'}: ${formatNumber(amount.toFixed(1))} kg`, {
          x: 50,
          y: trendY,
          font: bodyFont,
          size: 11,
          color: textColor,
        });
      });
      currentY -= (wasteByMonth.length * 25) + 20;
    } else {
      page.drawText('No waste collection data available', {
        x: 50,
        y: currentY,
        font: bodyFont,
        size: 11,
        color: rgb(0.6, 0.6, 0.6),
      });
      currentY -= 40;
    }

    // Top Performing Volunteers Section
    page.drawText('Top Performing Volunteers', {
      x: 50,
      y: currentY,
      font: headerFont,
      size: 20,
      color: primaryColor,
    });
    currentY -= 30;

    const topVolunteers = data.topVolunteers || [];
    if (topVolunteers.length > 0) {
      topVolunteers.forEach((volunteer, index) => {
        const volunteerY = currentY - (index * 50);
        
        // Volunteer card background
        page.drawRectangle({
          x: 50,
          y: volunteerY - 40,
          width: width - 100,
          height: 40,
          borderColor: borderColor,
          borderWidth: 1,
          color: index % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
        });

        // Rank number
        page.drawText(`${index + 1}.`, {
          x: 60,
          y: volunteerY - 25,
          font: titleFont,
          size: 14,
          color: primaryColor,
        });

        // Volunteer name - ensure it's a valid string
        const volunteerName = volunteer.fullName || 'Unknown Volunteer';
        page.drawText(volunteerName, {
          x: 90,
          y: volunteerY - 25,
          font: headerFont,
          size: 12,
          color: textColor,
        });

        // Volunteer stats
        const points = Number(volunteer.points) || 0;
        const waste = Number(volunteer.totalWasteContributed) || 0;
        const events = Number(volunteer.eventsCount) || 0;
        const statsText = `Points: ${formatNumber(points)} | Waste: ${formatNumber(waste.toFixed(1))} kg | Events: ${events}`;
        page.drawText(statsText, {
          x: 90,
          y: volunteerY - 40,
          font: bodyFont,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      });
    } else {
      page.drawText('No volunteer data available', {
        x: 50,
        y: currentY,
        font: bodyFont,
        size: 11,
        color: rgb(0.6, 0.6, 0.6),
      });
    }

    // Footer
    const footerY = 50;
    page.drawLine({
      start: { x: 50, y: footerY + 20 },
      end: { x: width - 50, y: footerY + 20 },
      thickness: 1,
      color: borderColor,
    });

    const pageText = 'Page 1 of 1';
    const pageTextWidth = bodyFont.widthOfTextAtSize(pageText, 10);
    page.drawText(pageText, {
      x: (width - pageTextWidth) / 2,
      y: footerY,
      font: bodyFont,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    const footerText = 'BeachGuardians - Protecting Our Coastlines';
    const footerTextWidth = bodyFont.widthOfTextAtSize(footerText, 10);
    page.drawText(footerText, {
      x: (width - footerTextWidth) / 2,
      y: footerY - 15,
      font: bodyFont,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="beachguardians-impact-report-${generatedDate.replace(/\//g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating impact report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Detailed error:', error);
    return NextResponse.json({ 
      error: `Failed to generate report: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

