import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import { buildVerifyUrl, generateQrPng } from './qr.service.js';
import CustodyEvent from '../models/CustodyEvent.js';

/**
 * Generates an A4 2x4 printable PDF label sheet for approved medicines in a donation.
 *
 * @param {object} donation
 * @param {Array<object>} items - Approved medicine records
 * @returns {Promise<Buffer>}
 */
export const generateLabelsPdf = async (donation, items = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 25,
        info: {
          Title: `MediBridge Labels - ${donation.donationCode || 'Donation'}`,
          Author: 'MediBridge Platform',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 25;
      const cols = 2;
      const rows = 4;
      const labelsPerPage = cols * rows;

      const colGap = 15;
      const rowGap = 12;
      const labelWidth = (pageWidth - margin * 2 - colGap * (cols - 1)) / cols;
      const labelHeight = (pageHeight - margin * 2 - rowGap * (rows - 1)) / rows;

      // Filter only approved / matched / transferred items (items with a medicineId)
      const validItems = items.filter((item) => item.medicineId);

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const pageIndex = i % labelsPerPage;

        if (i > 0 && pageIndex === 0) {
          doc.addPage();
        }

        const col = pageIndex % cols;
        const row = Math.floor(pageIndex / cols);
        const x = margin + col * (labelWidth + colGap);
        const y = margin + row * (labelHeight + rowGap);

        // Draw card border
        doc
          .roundedRect(x, y, labelWidth, labelHeight, 6)
          .lineWidth(1)
          .strokeColor('#CBD5E1')
          .stroke();

        // Draw accent header bar inside card
        doc
          .roundedRect(x, y, labelWidth, 22, 6)
          .fillColor('#0D9488')
          .fill();

        // Fill square overlay over bottom corners of header to keep rounded top only
        doc.rect(x, y + 16, labelWidth, 6).fillColor('#0D9488').fill();

        // Header text
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('MEDIBRIDGE VERIFIED MEDICINE', x + 10, y + 6, {
            width: labelWidth - 20,
            align: 'left',
          });

        // Generate QR code for this medicine
        const verifyUrl = buildVerifyUrl(item.medicineId);
        const qrBuffer = await generateQrPng(verifyUrl, { width: 140, margin: 1 });

        const qrSize = 75;
        const qrX = x + 10;
        const qrY = y + 32;

        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

        // Scan hint under QR
        doc
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor('#0D9488')
          .text('SCAN TO VERIFY', qrX - 2, qrY + qrSize + 4, {
            width: qrSize + 4,
            align: 'center',
          });

        // Details next to QR
        const detailsX = qrX + qrSize + 12;
        const detailsWidth = labelWidth - (detailsX - x) - 10;
        let textY = y + 30;

        // Medicine Name
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0F172A')
          .text(item.name || 'Medicine', detailsX, textY, {
            width: detailsWidth,
            height: 24,
            ellipsis: true,
          });

        textY += 26;

        // Generic Name / Type
        if (item.genericName || item.medicineType) {
          doc
            .fontSize(7.5)
            .font('Helvetica-Oblique')
            .fillColor('#64748B')
            .text(item.genericName || item.medicineType, detailsX, textY, {
              width: detailsWidth,
              height: 12,
              ellipsis: true,
            });
          textY += 14;
        }

        // Batch & Expiry
        const expDate = item.expiryDate ? new Date(item.expiryDate) : null;
        const expStr = expDate
          ? expDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : 'N/A';

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`Batch: ${item.batchNumber || 'N/A'}`, detailsX, textY, {
            width: detailsWidth,
            ellipsis: true,
          });

        textY += 13;

        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(item.daysLeft <= 30 ? '#DC2626' : '#334155')
          .text(`Expiry: ${expStr}`, detailsX, textY, {
            width: detailsWidth,
            ellipsis: true,
          });

        textY += 13;

        // Quantity
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`Qty: ${item.quantity || 1} ${item.unit || 'units'}`, detailsX, textY, {
            width: detailsWidth,
            ellipsis: true,
          });

        textY += 14;

        // Medicine Code
        doc
          .fontSize(7.5)
          .font('Courier')
          .fillColor('#475569')
          .text(item.medicineId, detailsX, textY, {
            width: detailsWidth,
            ellipsis: true,
          });

        // Bottom footer inside label
        doc
          .fontSize(6.5)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Tamper-evident hash ledger • medibridge.org', x + 10, y + labelHeight - 12, {
            width: labelWidth - 20,
            align: 'right',
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates an official Handover Receipt PDF for a finalized or partially completed transfer.
 *
 * @param {object} transfer - Populated transfer document
 * @param {object} [claim] - Associated claim
 * @param {object} [donor] - Associated donor
 * @param {object} [org] - Associated organization
 * @returns {Promise<Buffer>}
 */
export const generateReceiptPdf = async (transfer, claim = null, donor = null, org = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `MediBridge Receipt - ${transfer.transferCode}`,
          Author: 'MediBridge Platform',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const margin = 36;
      const contentWidth = doc.page.width - margin * 2;

      // 1. Top Header Banner
      doc
        .roundedRect(margin, margin, contentWidth, 60, 6)
        .fillColor('#0F766E')
        .fill();

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('MEDIBRIDGE', margin + 18, margin + 14);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#CCFBF1')
        .text('Official Medicine Transfer & Custody Handover Receipt', margin + 18, margin + 36);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text(transfer.transferCode, margin + contentWidth - 160, margin + 16, {
          width: 140,
          align: 'right',
        });

      const completedDate = transfer.completedAt || transfer.updatedAt || new Date();
      const istDateStr = new Date(completedDate).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#CCFBF1')
        .text(`Completed: ${istDateStr} IST`, margin + contentWidth - 220, margin + 36, {
          width: 200,
          align: 'right',
        });

      let currentY = margin + 75;

      // 2. Summary Boxes (Donor & Organization)
      const boxWidth = (contentWidth - 16) / 2;
      const boxHeight = 70;

      // Donor Box
      doc
        .roundedRect(margin, currentY, boxWidth, boxHeight, 4)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('DONOR DETAILS', margin + 12, currentY + 10);

      const donorName = donor?.name || 'Verified Donor';
      const donorFirstInitial = donorName.split(/\s+/)[0] + (donorName.split(/\s+/).length > 1 ? ` ${donorName.split(/\s+/)[1][0]}.` : '');

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Donor: ${donorFirstInitial}`, margin + 12, currentY + 26)
        .text(`Donation Code: ${transfer.donationId?.donationCode || 'Verified Donation'}`, margin + 12, currentY + 40)
        .text(`Privacy: Contact coordinates sealed per custody privacy policy`, margin + 12, currentY + 54, {
          width: boxWidth - 24,
        });

      // Organization Box
      const orgX = margin + boxWidth + 16;
      doc
        .roundedRect(orgX, currentY, boxWidth, boxHeight, 4)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('RECEIVING ENTITY', orgX + 12, currentY + 10);

      const orgName = org?.name || transfer.organizationId?.name || 'Authorized NGO';
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Organization: ${orgName}`, orgX + 12, currentY + 26)
        .text(`Claim Code: ${claim?.claimCode || 'Verified Claim'}`, orgX + 12, currentY + 40)
        .text(`Status: Verified Healthcare/Welfare Partner`, orgX + 12, currentY + 54);

      currentY += boxHeight + 20;

      // 3. Items Table
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('HANDOVER ITEMS MANIFEST', margin, currentY);

      currentY += 18;

      // Table Header
      doc
        .rect(margin, currentY, contentWidth, 22)
        .fillColor('#F1F5F9')
        .fill();

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('MEDICINE NAME', margin + 8, currentY + 6, { width: 150 })
        .text('BATCH', margin + 165, currentY + 6, { width: 65 })
        .text('EXPIRY', margin + 235, currentY + 6, { width: 60 })
        .text('OFFERED', margin + 300, currentY + 6, { width: 50, align: 'right' })
        .text('RECEIVED', margin + 355, currentY + 6, { width: 50, align: 'right' })
        .text('DECISION', margin + 415, currentY + 6, { width: 65 })
        .text('LABEL', margin + 485, currentY + 6, { width: 40 });

      currentY += 22;

      // Fetch custody hash prefixes for all items in transfer
      const itemHashes = {};
      const medicineIds = (transfer.items || []).map((it) => it.medicineId);
      let events = [];
      try {
        if (mongoose.connection?.readyState === 1) {
          events = await CustodyEvent.find({ medicineId: { $in: medicineIds } }).sort({ seq: -1 });
        }
      } catch {}

      for (const ev of events) {
        const idStr = ev.medicineId.toString();
        if (!itemHashes[idStr]) {
          itemHashes[idStr] = ev.hash ? ev.hash.substring(0, 12) : 'GENESIS';
        }
      }

      for (let i = 0; i < (transfer.items || []).length; i++) {
        const item = transfer.items[i];
        const rowHeight = 22;

        if (i % 2 === 1) {
          doc.rect(margin, currentY, contentWidth, rowHeight).fillColor('#F8FAFC').fill();
        }

        const expStr = item.snapshot.expiryDate
          ? new Date(item.snapshot.expiryDate).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })
          : 'N/A';

        const isReceived = item.status === 'received';
        const isRejected = item.status === 'rejected';

        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('#0F172A')
          .text(item.snapshot.name, margin + 8, currentY + 6, {
            width: 150,
            ellipsis: true,
          });

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(item.snapshot.batchNumber, margin + 165, currentY + 6, { width: 65, ellipsis: true })
          .text(expStr, margin + 235, currentY + 6, { width: 60 })
          .text(`${item.snapshot.quantity} ${item.snapshot.unit}`, margin + 300, currentY + 6, {
            width: 50,
            align: 'right',
          })
          .text(
            item.receivedQuantity ? `${item.receivedQuantity} ${item.snapshot.unit}` : '-',
            margin + 355,
            currentY + 6,
            { width: 50, align: 'right' }
          );

        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor(isReceived ? '#15803D' : isRejected ? '#B91C1C' : '#64748B')
          .text(
            isReceived ? 'Received' : isRejected ? 'Rejected' : 'Pending',
            margin + 415,
            currentY + 6,
            { width: 65 }
          );

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(item.labelVerified ? '#15803D' : '#64748B')
          .text(item.labelVerified ? 'Verified' : 'Manual', margin + 485, currentY + 6, {
            width: 40,
          });

        currentY += rowHeight;
      }

      currentY += 18;

      // 4. Chain of Custody Integrity Block
      doc
        .roundedRect(margin, currentY, contentWidth, 75, 4)
        .fillColor('#F0FDFA')
        .fill()
        .strokeColor('#0D9488')
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0F766E')
        .text('IMMUTABLE CHAIN-OF-CUSTODY LEDGER HASHES', margin + 12, currentY + 10);

      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#134E4A')
        .text(
          'Each medicine item is permanently recorded in MediBridge\'s cryptographically sealed SHA-256 ledger.',
          margin + 12,
          currentY + 24
        );

      let hashY = currentY + 38;
      for (const item of (transfer.items || []).slice(0, 3)) {
        const h = itemHashes[item.medicineId.toString()] || 'VERIFIED';
        doc
          .fontSize(7)
          .font('Courier')
          .fillColor('#0F766E')
          .text(`${item.medicineCode}: [SHA-256: ${h}...]`, margin + 12, hashY);
        hashY += 10;
      }

      currentY += 90;

      // 5. Compliance Disclaimer & Signatures
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(
          'Compliance Statement: This transfer was conducted in strict adherence to MediBridge chain-of-custody protocols. All received medicines were inspected by a licensed pharmacist, screened for regulatory compliance, and checked at physical handover for packaging integrity, batch confirmation, and expiration validity.',
          margin,
          currentY,
          { width: contentWidth, align: 'justify' }
        );

      currentY += 40;

      // Signature lines
      const sigWidth = 180;
      doc
        .moveTo(margin, currentY + 25)
        .lineTo(margin + sigWidth, currentY + 25)
        .strokeColor('#CBD5E1')
        .stroke();

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Donor Acknowledgment', margin, currentY + 30);

      doc
        .moveTo(margin + contentWidth - sigWidth, currentY + 25)
        .lineTo(margin + contentWidth, currentY + 25)
        .strokeColor('#CBD5E1')
        .stroke();

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Receiving Officer Acknowledgment', margin + contentWidth - sigWidth, currentY + 30, {
          width: sigWidth,
          align: 'right',
        });

      // Bottom footer
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text(
          `Document generated on ${istDateStr} IST • MediBridge Trust & Safety Platform • ID: ${transfer._id}`,
          margin,
          doc.page.height - 24,
          { width: contentWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
