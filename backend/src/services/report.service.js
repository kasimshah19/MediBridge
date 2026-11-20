import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';
import env from '../config/env.js';
import { TIMEZONE, nowIST } from '../utils/dates.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Verification from '../models/Verification.js';
import Transfer from '../models/Transfer.js';
import AuditLog from '../models/AuditLog.js';
import analyticsService from './analytics.service.js';
import recordAuditLog from './audit.service.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';

export const REPORT_TYPES = [
  'platform-summary',
  'donations',
  'verifications',
  'handovers',
  'expiry',
  'audit',
];

/**
 * Neutralize CSV formula injection by prepending a single quote
 */
export const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // If field starts with =, +, -, @, or tab
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes if containing commas or quotes or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Format date in IST
 */
const formatIST = (date) => {
  if (!date) return 'N/A';
  return DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE).toFormat('dd-MM-yyyy HH:mm:ss');
};

/**
 * Stream CSV report for donations, verifications, handovers, expiry, audit
 */
export const streamCsvReport = async ({ type, range, res, user }) => {
  const { fromDate, toDate } = range;
  const maxRows = env.REPORT_MAX_ROWS_CSV || 5000;
  let rowCount = 0;

  // Send UTF-8 BOM so Excel opens Hindi/special characters correctly
  res.write('\uFEFF');

  if (type === 'donations') {
    const headers = [
      'Donation Code',
      'Status',
      'Created (IST)',
      'Total Items',
      'City',
      'State',
    ];
    res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

    const cursor = Donation.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      status: { $ne: 'draft' },
    })
      .select('donationCode status createdAt items pickupLocation.city pickupLocation.state')
      .lean()
      .cursor({ batchSize: 500 });

    for await (const doc of cursor) {
      if (rowCount >= maxRows) break;
      rowCount++;
      const row = [
        doc.donationCode || '',
        doc.status || '',
        formatIST(doc.createdAt),
        doc.items?.length || 0,
        doc.pickupLocation?.city || '',
        doc.pickupLocation?.state || '',
      ];
      res.write(row.map(sanitizeCsvCell).join(',') + '\n');
    }
  } else if (type === 'verifications') {
    const headers = [
      'Medicine Name',
      'Batch Number',
      'Decision',
      'Reason Code',
      'Verified At (IST)',
      'Round',
    ];
    res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

    const cursor = Verification.find({
      verifiedAt: { $gte: fromDate, $lte: toDate },
    })
      .select('snapshot.name snapshot.batchNumber decision reasonCode verifiedAt round')
      .lean()
      .cursor({ batchSize: 500 });

    for await (const doc of cursor) {
      if (rowCount >= maxRows) break;
      rowCount++;
      const row = [
        doc.snapshot?.name || '',
        doc.snapshot?.batchNumber || '',
        doc.decision || '',
        doc.reasonCode || '',
        formatIST(doc.verifiedAt),
        doc.round || 1,
      ];
      res.write(row.map(sanitizeCsvCell).join(',') + '\n');
    }
  } else if (type === 'handovers') {
    const headers = [
      'Transfer Code',
      'Status',
      'Created At (IST)',
      'Completed At (IST)',
      'Total Items',
      'Receipt Verified',
    ];
    res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

    const cursor = Transfer.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .select('transferCode status createdAt completedAt items receipt')
      .lean()
      .cursor({ batchSize: 500 });

    for await (const doc of cursor) {
      if (rowCount >= maxRows) break;
      rowCount++;
      const row = [
        doc.transferCode || '',
        doc.status || '',
        formatIST(doc.createdAt),
        formatIST(doc.completedAt),
        doc.items?.length || 0,
        doc.receipt ? 'Yes' : 'No',
      ];
      res.write(row.map(sanitizeCsvCell).join(',') + '\n');
    }
  } else if (type === 'expiry') {
    const headers = [
      'Medicine Name',
      'Batch Number',
      'Expiry Date (IST)',
      'Priority',
      'Status',
      'Quantity',
    ];
    res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

    const cursor = Medicine.find({
      status: { $in: ['pending', 'approved', 'reserved', 'expired'] },
    })
      .select('name batchNumber expiryDate priority status quantity')
      .lean()
      .cursor({ batchSize: 500 });

    for await (const doc of cursor) {
      if (rowCount >= maxRows) break;
      rowCount++;
      const row = [
        doc.name || '',
        doc.batchNumber || '',
        formatIST(doc.expiryDate),
        doc.priority || '',
        doc.status || '',
        doc.quantity || 0,
      ];
      res.write(row.map(sanitizeCsvCell).join(',') + '\n');
    }
  } else if (type === 'audit') {
    const headers = [
      'Action',
      'Actor Type',
      'Created At (IST)',
      'Masked IP',
    ];
    res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

    const cursor = AuditLog.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .select('action actorType createdAt ip')
      .lean()
      .cursor({ batchSize: 500 });

    for await (const doc of cursor) {
      if (rowCount >= maxRows) break;
      rowCount++;

      // Mask IP last octet
      let maskedIp = 'N/A';
      if (doc.ip) {
        const parts = doc.ip.split('.');
        if (parts.length === 4) {
          maskedIp = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        } else {
          maskedIp = 'xxx.xxx.xxx.xxx';
        }
      }

      const row = [
        doc.action || '',
        doc.actorType || '',
        formatIST(doc.createdAt),
        maskedIp,
      ];
      res.write(row.map(sanitizeCsvCell).join(',') + '\n');
    }
  }

  res.end();

  await recordAuditLog({
    action: AUDIT_ACTIONS.REPORT_GENERATED,
    actorId: user._id,
    actorRole: user.role,
    meta: {
      type,
      format: 'csv',
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      rowCount,
    },
  });

  return rowCount;
};

/**
 * Generate PDF Report with pdfkit
 */
export const generatePdfReport = async ({ type, range, res, user }) => {
  const { fromDate, toDate } = range;
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

  doc.pipe(res);

  // Common Header
  doc
    .fontSize(22)
    .fillColor('#0284c7')
    .text('MediBridge', 40, 40)
    .fontSize(10)
    .fillColor('#64748b')
    .text('Medicine Redistribution & Chain-of-Custody Platform', 40, 65)
    .moveDown();

  const generatedAtStr = nowIST().toFormat('dd MMM yyyy, hh:mm a') + ' IST';
  const rangeStr = `${DateTime.fromJSDate(fromDate).setZone(TIMEZONE).toFormat('dd MMM yyyy')} to ${DateTime.fromJSDate(toDate).setZone(TIMEZONE).toFormat('dd MMM yyyy')}`;

  let rowCount = 0;

  if (type === 'platform-summary') {
    doc
      .fontSize(16)
      .fillColor('#0f172a')
      .text('Executive Platform Summary Report', 40, 85)
      .fontSize(9)
      .fillColor('#64748b')
      .text(`Generated: ${generatedAtStr} | Date Range: ${rangeStr}`)
      .moveDown(1.5);

    // Fetch Overview KPIs
    const overview = await analyticsService.getOverviewKPIs(range);
    const curr = overview.current;

    doc.fontSize(12).fillColor('#0284c7').text('1. Key Performance Indicators');
    doc.moveDown(0.5);

    const kpiRows = [
      ['Donations Submitted', String(curr.donationsSubmitted), 'Active Donors', String(curr.activeDonors)],
      ['Medicines Submitted', String(curr.medicinesSubmitted), 'Screening Pass Rate', `${curr.screeningPassRate}%`],
      ['Pharmacist Approval Rate', `${curr.pharmacistApprovalRate}%`, 'Avg Verification Turnaround', `${curr.avgVerificationHours} hrs`],
      ['Medicines Matched', String(curr.medicinesMatched), 'Medicines Transferred', String(curr.medicinesTransferred)],
      ['Completed Handovers', String(curr.handoversCompleted), 'Wastage Prevented Units', String(curr.wastagePreventedUnits)],
    ];

    let y = doc.y;
    doc.fontSize(9).fillColor('#1e293b');
    for (const r of kpiRows) {
      doc.text(`${r[0]}:`, 45, y, { bold: true });
      doc.text(r[1], 180, y);
      doc.text(`${r[2]}:`, 280, y, { bold: true });
      doc.text(r[3], 440, y);
      y += 18;
    }
    doc.y = y + 10;

    // Funnel Section
    doc.fontSize(12).fillColor('#0284c7').text('2. Medicine Lifecycle Funnel');
    doc.moveDown(0.5);
    const funnel = await analyticsService.getFunnel(range);
    y = doc.y;
    doc.fontSize(9).fillColor('#1e293b');
    for (const f of funnel.steps) {
      doc.text(`• ${f.label}:`, 45, y);
      doc.text(`${f.count} units (${f.overallConversion}% overall, ${f.stepConversion}% step conversion)`, 200, y);
      y += 16;
    }
    doc.y = y + 10;

    // Top Rejections
    doc.fontSize(12).fillColor('#0284c7').text('3. Safety Rejection Analysis');
    doc.moveDown(0.5);
    const rejections = await analyticsService.getRejections(range);
    y = doc.y;
    doc.fontSize(9).fillColor('#1e293b');
    doc.text('Top Pharmacist Clinical Rejections:', 45, y);
    y += 14;
    for (const p of (rejections.pharmacist || []).slice(0, 3)) {
      doc.text(`  - ${p.label}: ${p.count}`, 50, y);
      y += 14;
    }
    y += 6;
    doc.text('Top Handover Receipt Physical Rejections:', 45, y);
    y += 14;
    for (const r of (rejections.receipt || []).slice(0, 3)) {
      doc.text(`  - ${r.label}: ${r.count}`, 50, y);
      y += 14;
    }
    doc.y = y + 15;

    rowCount = 1;
  } else {
    // Tabular Report (donations, verifications, handovers, expiry)
    const titleMap = {
      donations: 'Donations Audit Report',
      verifications: 'Pharmacist Verifications Report',
      handovers: 'Physical Handovers Report',
      expiry: 'Medicine Expiry Risk Report',
    };

    doc
      .fontSize(16)
      .fillColor('#0f172a')
      .text(titleMap[type] || 'Platform Report', 40, 85)
      .fontSize(9)
      .fillColor('#64748b')
      .text(`Generated: ${generatedAtStr} | Range: ${rangeStr}`)
      .moveDown();

    const maxPdfRows = env.REPORT_MAX_ROWS_PDF || 500;
    doc.fontSize(8).fillColor('#64748b').text(`Note: Showing up to ${maxPdfRows} rows. Download CSV for full datasets.`);
    doc.moveDown(0.8);

    if (type === 'donations') {
      const items = await Donation.find({
        createdAt: { $gte: fromDate, $lte: toDate },
        status: { $ne: 'draft' },
      })
        .select('donationCode status createdAt items pickupLocation.city')
        .limit(maxPdfRows)
        .lean();

      let y = doc.y;
      doc.fontSize(8).fillColor('#0284c7');
      doc.text('Code', 40, y);
      doc.text('Status', 160, y);
      doc.text('City', 270, y);
      doc.text('Items', 370, y);
      doc.text('Created', 430, y);
      y += 14;

      doc.fillColor('#1e293b');
      for (const it of items) {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        doc.text(it.donationCode || '', 40, y);
        doc.text(it.status || '', 160, y);
        doc.text(it.pickupLocation?.city || 'N/A', 270, y);
        doc.text(String(it.items?.length || 0), 370, y);
        doc.text(formatIST(it.createdAt).slice(0, 10), 430, y);
        y += 13;
        rowCount++;
      }
    } else if (type === 'verifications') {
      const items = await Verification.find({
        verifiedAt: { $gte: fromDate, $lte: toDate },
      })
        .select('snapshot.name decision reasonCode verifiedAt')
        .limit(maxPdfRows)
        .lean();

      let y = doc.y;
      doc.fontSize(8).fillColor('#0284c7');
      doc.text('Medicine Name', 40, y);
      doc.text('Decision', 220, y);
      doc.text('Reason Code', 320, y);
      doc.text('Verified At', 440, y);
      y += 14;

      doc.fillColor('#1e293b');
      for (const it of items) {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        doc.text(it.snapshot?.name?.slice(0, 28) || '', 40, y);
        doc.text(it.decision || '', 220, y);
        doc.text(it.reasonCode || '-', 320, y);
        doc.text(formatIST(it.verifiedAt).slice(0, 10), 440, y);
        y += 13;
        rowCount++;
      }
    } else {
      doc.fontSize(10).fillColor('#1e293b').text('Detailed dataset compiled. Please download CSV for comprehensive row data.');
      rowCount = 1;
    }
  }

  // Compliance Footer on all pages
  const rangeCount = doc.bufferedPageRange().count;
  for (let i = 0; i < rangeCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(
        'MediBridge is a software platform. This report summarises recorded activity and does not certify medicine quality.',
        40,
        790,
        { align: 'center', width: 515 }
      )
      .text(`Page ${i + 1} of ${rangeCount}`, 40, 802, { align: 'center', width: 515 });
  }

  doc.end();

  await recordAuditLog({
    action: AUDIT_ACTIONS.REPORT_GENERATED,
    actorId: user._id,
    actorRole: user.role,
    meta: {
      type,
      format: 'pdf',
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      rowCount,
    },
  });

  return rowCount;
};

export default {
  REPORT_TYPES,
  sanitizeCsvCell,
  streamCsvReport,
  generatePdfReport,
};
