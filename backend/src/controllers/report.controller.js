import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import reportService, { REPORT_TYPES } from '../services/report.service.js';
import analyticsService from '../services/analytics.service.js';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../utils/dates.js';

/**
 * GET /api/admin/reports/:type?format=pdf|csv&from=&to=
 */
export const downloadReport = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  let { format } = req.query;

  if (!REPORT_TYPES.includes(type)) {
    return next(
      new ApiError(
        400,
        `Invalid report type "${type}". Allowed types: ${REPORT_TYPES.join(', ')}`
      )
    );
  }

  // Determine and validate format
  if (!format) {
    format = type === 'platform-summary' ? 'pdf' : 'csv';
  }
  format = format.toLowerCase();

  if (type === 'platform-summary' && format === 'csv') {
    return next(new ApiError(422, 'Platform summary report is available in PDF format only.'));
  }

  if (type === 'audit' && format === 'pdf') {
    return next(new ApiError(422, 'Audit logs report is available in CSV format only.'));
  }

  if (!['pdf', 'csv'].includes(format)) {
    return next(new ApiError(422, 'Invalid format. Supported formats are "pdf" and "csv".'));
  }

  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const fromStr = DateTime.fromJSDate(range.fromDate).setZone(TIMEZONE).toFormat('yyyyMMdd');
  const toStr = DateTime.fromJSDate(range.toDate).setZone(TIMEZONE).toFormat('yyyyMMdd');
  const filename = `medibridge-${type}-${fromStr}-${toStr}.${format}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    await reportService.streamCsvReport({
      type,
      range,
      res,
      user: req.user,
    });
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    await reportService.generatePdfReport({
      type,
      range,
      res,
      user: req.user,
    });
  }
});

export default {
  downloadReport,
};
