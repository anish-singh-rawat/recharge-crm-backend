import { partnerOrderService } from '../services/partnerOrder.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { BusinessError } from '../helpers/error.helper.js';

export const partnerOrderController = {
  importExcel: asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      throw new BusinessError('Please select and upload an Excel file (.xlsx or .xls).');
    }

    const result = await partnerOrderService.importExcel(req.file.buffer);
    sendSuccess(res, {
      message: `Excel imported successfully: ${result.importedOrders} orders saved, ${result.skippedDuplicates} duplicates skipped.`,
      data: result,
    });
  }),

  listOrders: asyncHandler(async (req, res) => {
    const { page, limit, search, status, prmId } = req.query;
    const result = await partnerOrderService.listOrders({
      page,
      limit,
      search,
      status,
      prmId,
    });
    sendSuccess(res, {
      message: 'Orders retrieved successfully',
      data: result,
    });
  }),

  updatePartnerMobile: asyncHandler(async (req, res) => {
    const { prmId } = req.params;
    const { mobileNumber } = req.body;
    const partner = await partnerOrderService.updatePartnerMobile(prmId, mobileNumber);
    sendSuccess(res, {
      message: 'Partner mobile number updated successfully',
      data: partner,
    });
  }),

  updateOrderPayment: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paidAmount } = req.body;
    const order = await partnerOrderService.updateOrderPayment(id, paidAmount);
    sendSuccess(res, {
      message: 'Order payment updated successfully',
      data: order,
    });
  }),

  bulkMarkAsPaid: asyncHandler(async (req, res) => {
    const { orderIds } = req.body;
    const result = await partnerOrderService.bulkMarkAsPaid(orderIds);
    sendSuccess(res, {
      message: `${result.updated} order(s) marked as fully paid.`,
      data: result,
    });
  }),

  getSummary: asyncHandler(async (req, res) => {
    const summary = await partnerOrderService.getSummary();
    sendSuccess(res, {
      message: 'Summary metrics retrieved successfully',
      data: summary,
    });
  }),

  sendNotifications: asyncHandler(async (req, res) => {
    const { template, orderIds, partnerPrmIds } = req.body;
    const result = await partnerOrderService.sendPaymentNotifications({
      template,
      orderIds,
      partnerPrmIds,
    });
    sendSuccess(res, {
      message: result.message,
      data: result,
    });
  }),
};
