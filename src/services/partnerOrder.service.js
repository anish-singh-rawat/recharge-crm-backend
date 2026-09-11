import * as xlsx from 'xlsx';
import { PartnerOrder, PartnerUser, User } from '../models/index.js';
import { whatsappService } from './whatsapp.service.js';
import { getIO } from '../socket/socket.js';
import logger from '../config/logger.js';
import { BusinessError } from '../helpers/error.helper.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeHeader(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function formatOrderTime(rawTime) {
  if (!rawTime && rawTime !== 0) return '';
  const str = String(rawTime).trim();
  if (!str) return '';

  // If already contains colons like "04:12:07 AM" or "15:13:13"
  if (str.includes(':')) {
    const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
    if (match) {
      let [_, h, m, s, period] = match;
      s = s || '00';
      if (!period) {
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${m}:${s} ${ampm}`;
      }
      return `${parseInt(h, 10)}:${m}:${s} ${period.toUpperCase()}`;
    }
    return str;
  }

  // Pure digits: e.g. 41207 (4:12:07 AM) or 151313 (3:13:13 PM)
  if (/^\d+$/.test(str)) {
    const padded = str.padStart(6, '0');
    if (padded.length === 6) {
      const hour24 = parseInt(padded.slice(0, 2), 10);
      const min = padded.slice(2, 4);
      const sec = padded.slice(4, 6);

      if (hour24 >= 0 && hour24 < 24 && parseInt(min, 10) < 60 && parseInt(sec, 10) < 60) {
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const displayHour = hour24 % 12 || 12;
        return `${displayHour}:${min}:${sec} ${ampm}`;
      }
    }
  }

  return str;
}

class PartnerOrderService {
  constructor() {
    this._hasSyncedDueAmounts = false;
  }

  async syncExistingOrderDueAmounts() {
    if (this._hasSyncedDueAmounts) return;
    this._hasSyncedDueAmounts = true;
    try {
      const orders = await PartnerOrder.find();
      for (const order of orders) {
        const orderAmt = Number(order.orderAmount) || 0;
        const netPayable = Math.round(orderAmt * 0.97 * 100) / 100;
        const paidAmt = Number(order.paidAmount) || 0;
        const expectedDue = Math.max(0, Math.round((netPayable - paidAmt) * 100) / 100);
        const expectedStatus =
          paidAmt >= netPayable && netPayable > 0
            ? 'paid'
            : paidAmt > 0
            ? 'partially_paid'
            : 'pending';

        let needsSave = false;
        if (order.dueAmount !== expectedDue || order.paymentStatus !== expectedStatus) {
          order.dueAmount = expectedDue;
          order.paymentStatus = expectedStatus;
          needsSave = true;
        }

        if (paidAmt > 0 && (!order.paymentHistory || order.paymentHistory.length === 0)) {
          if (!order.paymentHistory) order.paymentHistory = [];
          order.paymentHistory.push({
            receivedAmount: paidAmt,
            paidBefore: 0,
            paidAfter: paidAmt,
            dueAfter: expectedDue,
            receivedAt: order.updatedAt || order.createdAt || new Date(),
            note: 'Initial payment record',
          });
          needsSave = true;
        }

        if (needsSave) {
          await order.save();
        }
      }
    } catch (err) {
      logger.warn('[PartnerOrder] Could not sync due amounts:', err.message);
    }
  }

  async importExcel(buffer) {
    if (!buffer || buffer.length === 0) {
      throw new BusinessError('Empty file provided. Please upload a valid Excel spreadsheet.');
    }

    let workbook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    } catch (err) {
      throw new BusinessError(`Failed to parse Excel spreadsheet: ${err.message}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BusinessError('Excel file contains no worksheets.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length < 2) {
      throw new BusinessError('Excel spreadsheet has insufficient rows.');
    }

    let headerRowIndex = -1;
    let colIndexMap = {};

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const tempMap = {};
      row.forEach((cell, idx) => {
        const norm = normalizeHeader(cell);
        if (!norm) return;

        if (['orderid', 'orderno', 'ordernumber'].includes(norm)) {
          tempMap.orderId = idx;
        } else if (['orderdate', 'date', 'orddt'].includes(norm)) {
          tempMap.orderDate = idx;
        } else if (['ordertime', 'time', 'ordtm'].includes(norm)) {
          tempMap.orderTime = idx;
        } else if (['partnername', 'partner', 'merchantname'].includes(norm)) {
          tempMap.partnerName = idx;
        } else if (['orderamount', 'amount', 'ordamount', 'ordamt'].includes(norm)) {
          tempMap.orderAmount = idx;
        } else if (['partnerprmid', 'partnerprm', 'prmid', 'partnerid'].includes(norm)) {
          tempMap.partnerPrmId = idx;
        }
      });

      if (tempMap.orderId !== undefined && tempMap.partnerPrmId !== undefined && tempMap.orderAmount !== undefined) {
        headerRowIndex = r;
        colIndexMap = tempMap;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new BusinessError(
        'Could not locate expected columns. Please ensure the Excel contains "Order ID", "Partner PRM ID", "Partner Name", and "Order Amount".'
      );
    }

    logger.info(`[PartnerOrder] Header detected at row ${headerRowIndex + 1}:`, colIndexMap);

    const sanitizedRows = [];
    const uniquePrmMap = new Map(); // prmId -> partnerName

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawOrderId = colIndexMap.orderId !== undefined ? row[colIndexMap.orderId] : '';
      const rawPrmId = colIndexMap.partnerPrmId !== undefined ? row[colIndexMap.partnerPrmId] : '';
      const rawAmount = colIndexMap.orderAmount !== undefined ? row[colIndexMap.orderAmount] : '';
      const rawPartnerName = colIndexMap.partnerName !== undefined ? row[colIndexMap.partnerName] : '';
      const rawDate = colIndexMap.orderDate !== undefined ? row[colIndexMap.orderDate] : '';
      const rawTime = colIndexMap.orderTime !== undefined ? row[colIndexMap.orderTime] : '';

      const orderId = String(rawOrderId || '').trim();
      const partnerPrmId = String(rawPrmId || '').trim();
      const partnerName = String(rawPartnerName || '').trim();

      if (!orderId || !partnerPrmId) continue;

      const cleanAmtStr = String(rawAmount || '')
        .replace(/,/g, '')
        .replace(/[^0-9.-]/g, '');
      const orderAmount = parseFloat(cleanAmtStr) || 0;

      let orderDate = '';
      if (rawDate instanceof Date) {
        orderDate = rawDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      } else {
        orderDate = String(rawDate || '').trim();
      }

      const orderTime = formatOrderTime(rawTime);

      sanitizedRows.push({
        orderId,
        partnerPrmId,
        partnerName: partnerName || `Partner ${partnerPrmId}`,
        orderAmount,
        orderDate,
        orderTime,
      });

      if (!uniquePrmMap.has(partnerPrmId) && partnerName) {
        uniquePrmMap.set(partnerPrmId, partnerName);
      }
    }

    if (sanitizedRows.length === 0) {
      throw new BusinessError('No valid order records found in the uploaded file.');
    }

    // 1. Maintain Partner Directory without duplicating users
    // If a partner already exists, do NOT overwrite their saved mobileNumber!
    let newPartnersCount = 0;
    for (const [prmId, pName] of uniquePrmMap.entries()) {
      const existing = await PartnerUser.findOne({ partnerPrmId: prmId });
      if (!existing) {
        await PartnerUser.create({
          partnerPrmId: prmId,
          partnerName: pName,
          mobileNumber: '',
        });
        newPartnersCount++;
      } else if (!existing.partnerName && pName) {
        existing.partnerName = pName;
        await existing.save();
      }
    }

    // 2. Insert Orders with strict de-duplication on { orderId, partnerPrmId }
    let importedOrders = 0;
    let skippedDuplicates = 0;

    for (const row of sanitizedRows) {
      const exists = await PartnerOrder.findOne({
        orderId: row.orderId,
        partnerPrmId: row.partnerPrmId,
      });

      if (exists) {
        skippedDuplicates++;
        continue;
      }

      const netPayable = Math.round((row.orderAmount || 0) * 0.97 * 100) / 100;
      await PartnerOrder.create({
        orderId: row.orderId,
        orderTime: row.orderTime,
        orderDate: row.orderDate,
        partnerName: row.partnerName,
        orderAmount: row.orderAmount,
        partnerPrmId: row.partnerPrmId,
        paidAmount: 0,
        dueAmount: netPayable,
        paymentStatus: 'pending',
      });
      importedOrders++;
    }

    logger.info(
      `[PartnerOrder] Import completed: ${importedOrders} orders imported, ${skippedDuplicates} duplicates skipped, ${newPartnersCount} new partners registered.`
    );

    return {
      totalRowsProcessed: sanitizedRows.length,
      importedOrders,
      skippedDuplicates,
      newPartnersCount,
    };
  }

  /**
   * Lists orders with pagination, search, status filter, and joined partner mobile numbers
   */
  async listOrders({ page = 1, limit = 20, search = '', status = 'all', prmId = '' }) {
    await this.syncExistingOrderDueAmounts();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (prmId) {
      filter.partnerPrmId = prmId;
    }

    if (status === 'due') {
      filter.dueAmount = { $gt: 0 };
    } else if (['pending', 'partially_paid', 'paid'].includes(status)) {
      filter.paymentStatus = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { orderId: searchRegex },
        { partnerName: searchRegex },
        { partnerPrmId: searchRegex },
      ];
    }

    const [orders, total] = await Promise.all([
      PartnerOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      PartnerOrder.countDocuments(filter),
    ]);

    // Attach current mobile numbers from PartnerUser directory
    const prmIds = [...new Set(orders.map((o) => o.partnerPrmId))];
    const partners = await PartnerUser.find({ partnerPrmId: { $in: prmIds } }).lean();
    const partnerMap = new Map(partners.map((p) => [p.partnerPrmId, p]));

    const enrichedOrders = orders.map((o) => {
      const partner = partnerMap.get(o.partnerPrmId);
      return {
        ...o,
        partnerMobile: partner?.mobileNumber || '',
        partnerNotes: partner?.notes || '',
      };
    });

    return {
      orders: enrichedOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }


  async updatePartnerMobile(partnerPrmId, mobileNumber) {
    if (!partnerPrmId) {
      throw new BusinessError('Partner PRM ID is required');
    }

    let cleanMobile = String(mobileNumber || '').replace(/[^0-9]/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2);
    }

    const partner = await PartnerUser.findOneAndUpdate(
      { partnerPrmId: String(partnerPrmId).trim() },
      { mobileNumber: cleanMobile },
      { new: true, upsert: true }
    );

    logger.info(`[PartnerOrder] Updated mobile for PRM ID ${partnerPrmId}: ${cleanMobile}`);
    return partner;
  }

  async updateOrderPayment(id, paidAmount) {
    const order = await PartnerOrder.findById(id);
    if (!order) {
      throw new BusinessError('Order not found');
    }

    const numericPaid = Math.max(0, parseFloat(paidAmount) || 0);
    const paidBefore = order.paidAmount || 0;
    const receivedAmount = Math.round((numericPaid - paidBefore) * 100) / 100;

    order.paidAmount = numericPaid;

    // Compute dueAfter based on 97% net payable
    const netPayable = Math.round((order.orderAmount || 0) * 0.97 * 100) / 100;
    const dueAfter = Math.max(0, Math.round((netPayable - numericPaid) * 100) / 100);

    // Always record a history entry when paidAmount actually changes
    if (numericPaid !== paidBefore) {
      order.paymentHistory.push({
        receivedAmount,
        paidBefore,
        paidAfter: numericPaid,
        dueAfter,
        receivedAt: new Date(),
      });
    }

    await order.save();

    let whatsappInfo = { queued: false, reason: '' };

    // Automatically send WhatsApp payment receipt to customer if payment was received
    if (numericPaid > 0) {
      try {
        const cleanPrm = String(order.partnerPrmId || '').trim();
        const partner = await PartnerUser.findOne({
          $or: [
            { partnerPrmId: cleanPrm },
            { partnerPrmId: { $regex: new RegExp(`^${cleanPrm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          ],
        }).lean();

        const rawMobile = partner?.mobileNumber || '';
        let cleanMobile = String(rawMobile).replace(/[^0-9]/g, '');
        if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;

        if (!cleanMobile || cleanMobile.length < 10) {
          whatsappInfo = {
            queued: false,
            reason: `No mobile number saved for Partner PRM ID "${order.partnerPrmId}"`,
          };
          logger.warn(`[PartnerOrder] Cannot send WhatsApp receipt: No mobile number for PRM ID ${order.partnerPrmId}`);
        } else {
          const wsStatus = whatsappService.getStatus();
          if (!wsStatus.isReady) {
            whatsappInfo = {
              queued: false,
              mobile: cleanMobile,
              reason: 'WhatsApp is disconnected. Please scan QR in Admin -> WhatsApp',
            };
            logger.warn(`[PartnerOrder] WhatsApp is disconnected. Could not dispatch receipt to ${cleanMobile}`);
          } else {
            const partnerDisplayName = order.partnerName || partner?.partnerName || 'Partner';
            const orderDateStr = order.orderDate || '';
            const orderTimeStr = formatOrderTime(order.orderTime) || '';
            const dateLine = orderTimeStr ? `${orderDateStr} ${orderTimeStr}`.trim() : orderDateStr;
            const statusText = order.paymentStatus === 'paid' ? 'PAID ✅' : 'PARTIALLY PAID 🟡';

            const receiptMsg =
              `✅ *Payment Received Confirmation*\n\n` +
              `Dear *${partnerDisplayName}*,\n` +
              `We have successfully recorded your payment towards Order *#${order.orderId}*.\n\n` +
              `📋 *Order Details:*\n` +
              `• *Order ID:* ${order.orderId}\n` +
              `• *PRM ID:* ${order.partnerPrmId}\n` +
              (dateLine ? `• *Order Date:* ${dateLine}\n` : '') +
              `\n💰 *Payment Summary:*\n` +
              `• *Total Order Amount:* ₹${order.orderAmount.toFixed(2)}\n` +
              `• *Amount Paid:* ₹${order.paidAmount.toFixed(2)}\n` +
              `• *Remaining Due:* ₹${order.dueAmount.toFixed(2)}\n` +
              `• *Payment Status:* ${statusText}\n\n` +
              `Thank you for your business! 🙏`;

            // Process through anti-ban queue in background
            this._processNotificationQueue([{
              orderId: order._id,
              orderIdStr: order.orderId,
              partnerPrmId: order.partnerPrmId,
              partnerName: order.partnerName,
              dueAmount: order.dueAmount,
              mobileNumber: cleanMobile,
              message: receiptMsg,
            }]).catch((err) => {
              logger.error(`[PartnerOrder] Auto WhatsApp receipt error for order ${order.orderId}: ${err.message}`);
            });

            whatsappInfo = {
              queued: true,
              mobile: cleanMobile,
              reason: `WhatsApp receipt queued for ${cleanMobile}`,
            };
            logger.info(`[PartnerOrder] Auto WhatsApp payment receipt queued for order ${order.orderId} (${cleanMobile})`);
          }
        }
      } catch (err) {
        logger.error(`[PartnerOrder] Error triggering auto WhatsApp payment receipt: ${err.message}`);
        whatsappInfo = { queued: false, reason: `Failed to trigger WhatsApp: ${err.message}` };
      }
    }

    return { order, whatsapp: whatsappInfo };
  }

  async bulkMarkAsPaid(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BusinessError('Please provide at least one order ID.');
    }

    // Fetch all matching orders
    const orders = await PartnerOrder.find({ _id: { $in: orderIds } });

    if (orders.length === 0) {
      throw new BusinessError('No matching orders found.');
    }

    // Set paidAmount = netPayable (orderAmount - 3% retailer commission) for each so dueAmount becomes 0 via pre-save hook
    for (const order of orders) {
      const netPayable = Math.round((order.orderAmount || 0) * 0.97 * 100) / 100;
      const paidBefore = order.paidAmount || 0;
      if (netPayable !== paidBefore) {
        const receivedAmount = Math.round((netPayable - paidBefore) * 100) / 100;
        if (!order.paymentHistory) {
          order.paymentHistory = [];
        }
        order.paymentHistory.push({
          receivedAmount,
          paidBefore,
          paidAfter: netPayable,
          dueAfter: 0,
          receivedAt: new Date(),
          note: 'Bulk marked as paid',
        });
      }
      order.paidAmount = netPayable;
      await order.save();
    }

    logger.info(`[PartnerOrder] Bulk mark paid: ${orders.length} orders marked as paid.`);

    let whatsappCount = 0;
    let whatsappReason = '';

    // Automatically send WhatsApp payment receipts to customers
    try {
      const wsStatus = whatsappService.getStatus();
      if (!wsStatus.isReady) {
        whatsappReason = 'WhatsApp is disconnected. Please scan QR in Admin -> WhatsApp';
        logger.warn(`[PartnerOrder] WhatsApp is disconnected. Skipping bulk mark receipts.`);
      } else {
        const prmIds = [...new Set(orders.map((o) => String(o.partnerPrmId || '').trim()))];
        const partners = await PartnerUser.find({
          $or: [
            { partnerPrmId: { $in: prmIds } },
            ...prmIds.map((p) => ({ partnerPrmId: { $regex: new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })),
          ],
        }).lean();

        const partnerMap = new Map();
        partners.forEach((p) => {
          partnerMap.set(String(p.partnerPrmId).trim().toLowerCase(), p);
        });

        const queueItems = [];
        for (const order of orders) {
          const partnerKey = String(order.partnerPrmId || '').trim().toLowerCase();
          const partner = partnerMap.get(partnerKey);
          const rawMobile = partner?.mobileNumber || '';
          let cleanMobile = String(rawMobile).replace(/[^0-9]/g, '');
          if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;

          if (cleanMobile && cleanMobile.length >= 10) {
            const partnerDisplayName = order.partnerName || partner?.partnerName || 'Partner';
            const orderDateStr = order.orderDate || '';
            const orderTimeStr = formatOrderTime(order.orderTime) || '';
            const dateLine = orderTimeStr ? `${orderDateStr} ${orderTimeStr}`.trim() : orderDateStr;

            const receiptMsg =
              `✅ *Payment Received Confirmation*\n\n` +
              `Dear *${partnerDisplayName}*,\n` +
              `Your payment for Order *#${order.orderId}* has been received and marked as *PAID*.\n\n` +
              `📋 *Order Details:*\n` +
              `• *Order ID:* ${order.orderId}\n` +
              `• *PRM ID:* ${order.partnerPrmId}\n` +
              (dateLine ? `• *Order Date:* ${dateLine}\n` : '') +
              `\n💰 *Payment Summary:*\n` +
              `• *Total Order Amount:* ₹${order.orderAmount.toFixed(2)}\n` +
              `• *Amount Paid:* ₹${order.paidAmount.toFixed(2)}\n` +
              `• *Remaining Due:* ₹0.00\n` +
              `• *Payment Status:* PAID ✅\n\n` +
              `Thank you for your business! 🙏`;

            queueItems.push({
              orderId: order._id,
              orderIdStr: order.orderId,
              partnerPrmId: order.partnerPrmId,
              partnerName: order.partnerName,
              dueAmount: 0,
              mobileNumber: cleanMobile,
              message: receiptMsg,
            });
          }
        }

        whatsappCount = queueItems.length;

        if (queueItems.length > 0) {
          this._processNotificationQueue(queueItems).catch((err) => {
            logger.error(`[PartnerOrder] Bulk mark paid WhatsApp error: ${err.message}`);
          });
          logger.info(`[PartnerOrder] Queued ${queueItems.length} WhatsApp receipts for bulk paid orders.`);
        } else {
          whatsappReason = 'None of the marked orders had a saved customer mobile number';
        }
      }
    } catch (err) {
      logger.error(`[PartnerOrder] Error dispatching bulk paid WhatsApp receipts: ${err.message}`);
      whatsappReason = `WhatsApp dispatch error: ${err.message}`;
    }

    return {
      updated: orders.length,
      orderIds: orders.map((o) => o._id),
      whatsappCount,
      whatsappReason,
    };
  }

  async deleteOrder(id) {
    const order = await PartnerOrder.findByIdAndDelete(id);
    if (!order) {
      throw new BusinessError('Order not found or already deleted');
    }
    logger.info(`[PartnerOrder] Deleted order ID: ${order.orderId} (${id})`);
    return {
      deleted: true,
      orderId: order.orderId,
      id: order._id,
    };
  }

  async bulkDelete(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BusinessError('Please provide at least one order ID to delete.');
    }

    const result = await PartnerOrder.deleteMany({ _id: { $in: orderIds } });
    logger.info(`[PartnerOrder] Bulk deleted ${result.deletedCount} orders.`);

    return {
      deletedCount: result.deletedCount,
      orderIds,
    };
  }

  async getSummary() {
    await this.syncExistingOrderDueAmounts();
    const [totalOrders, dueOrdersCount, aggregates, totalPartners, partnersWithMobile] =
      await Promise.all([
        PartnerOrder.countDocuments(),
        PartnerOrder.countDocuments({ dueAmount: { $gt: 0 } }),
        PartnerOrder.aggregate([
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$orderAmount' },
              totalPaid: { $sum: '$paidAmount' },
              totalDue: { $sum: '$dueAmount' },
            },
          },
        ]),
        PartnerUser.countDocuments(),
        PartnerUser.countDocuments({ mobileNumber: { $ne: '' } }),
      ]);

    const stats = aggregates[0] || { totalAmount: 0, totalPaid: 0, totalDue: 0 };

    return {
      totalOrders,
      dueOrdersCount,
      totalAmount: Math.round((stats.totalAmount || 0) * 100) / 100,
      totalPaid: Math.round((stats.totalPaid || 0) * 100) / 100,
      totalDue: Math.round((stats.totalDue || 0) * 100) / 100,
      totalPartners,
      partnersWithMobile,
      partnersMissingMobile: Math.max(0, totalPartners - partnersWithMobile),
    };
  }

  async sendPaymentNotifications({ template, orderIds = [], partnerPrmIds = [] }) {
    if (!template || !template.trim()) {
      throw new BusinessError('Message template cannot be empty.');
    }

    const filter = {};

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      filter._id = { $in: orderIds };
    } else if (Array.isArray(partnerPrmIds) && partnerPrmIds.length > 0) {
      filter.partnerPrmId = { $in: partnerPrmIds };
      filter.dueAmount = { $gt: 0 };
    } else {
      filter.dueAmount = { $gt: 0 };
    }

    const targetOrders = await PartnerOrder.find(filter).lean();
    if (targetOrders.length === 0) {
      throw new BusinessError(
        orderIds.length > 0
          ? 'No orders found matching the selected IDs.'
          : 'No orders with pending dues found matching the selection.'
      );
    }

    // Match each order with its partner's mobile number
    const prmIds = [...new Set(targetOrders.map((o) => String(o.partnerPrmId || '').trim()).filter(Boolean))];
    const partners = await PartnerUser.find({
      $or: [
        { partnerPrmId: { $in: prmIds } },
        ...prmIds.map((p) => ({ partnerPrmId: { $regex: new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })),
      ],
    }).lean();

    const partnerMap = new Map();
    partners.forEach((p) => {
      partnerMap.set(String(p.partnerPrmId).trim().toLowerCase(), p);
    });

    // Also check User (retailer) collection if any partner name or phone matches
    const partnerNames = [...new Set(targetOrders.map((o) => String(o.partnerName || '').trim()).filter(Boolean))];
    let usersByName = new Map();
    if (partnerNames.length > 0) {
      try {
        const users = await User.find({ name: { $in: partnerNames }, phone: { $exists: true, $ne: '' } }).lean();
        users.forEach((u) => usersByName.set(u.name.trim().toLowerCase(), u.phone));
      } catch (e) {
        // ignore
      }
    }

    // Filter to items that have a valid mobile number
    const queueItems = [];
    let skippedNoPhone = 0;

    for (const order of targetOrders) {
      const partnerKey = String(order.partnerPrmId || '').trim().toLowerCase();
      const partner = partnerMap.get(partnerKey);
      let rawMobile = partner?.mobileNumber || '';
      if (!rawMobile && order.partnerName) {
        rawMobile = usersByName.get(order.partnerName.trim().toLowerCase()) || '';
      }

      let cleanMobile = String(rawMobile).replace(/[^0-9]/g, '');

      if (!cleanMobile || cleanMobile.length < 10) {
        skippedNoPhone++;
        continue;
      }

      if (cleanMobile.length === 10) {
        cleanMobile = '91' + cleanMobile;
      }

      // Merge template placeholders
      const renderedMessage = template
        .replace(/{partnerName}/g, order.partnerName || partner?.partnerName || 'Partner')
        .replace(/{orderId}/g, order.orderId || '')
        .replace(/{orderAmount}/g, `₹${order.orderAmount.toFixed(2)}`)
        .replace(/{paidAmount}/g, `₹${(order.paidAmount || 0).toFixed(2)}`)
        .replace(/{dueAmount}/g, `₹${(order.dueAmount || 0).toFixed(2)}`)
        .replace(/{orderDate}/g, order.orderDate || '')
        .replace(/{orderTime}/g, formatOrderTime(order.orderTime) || '')
        .replace(/{partnerPrmId}/g, order.partnerPrmId || '')
        .replace(/{paymentStatus}/g, order.paymentStatus || ((order.dueAmount || 0) > 0 ? 'due' : 'paid'));

      queueItems.push({
        orderId: order._id,
        orderIdStr: order.orderId,
        partnerPrmId: order.partnerPrmId,
        partnerName: order.partnerName,
        dueAmount: order.dueAmount,
        mobileNumber: cleanMobile,
        message: renderedMessage,
      });
    }

    if (queueItems.length === 0) {
      throw new BusinessError(
        'None of the selected orders have a saved mobile number. Please add mobile numbers for the partner/retailer first.'
      );
    }

    // Trigger asynchronous queue in background with 5-10 second random delay
    this._processNotificationQueue(queueItems);

    return {
      success: true,
      totalQueued: queueItems.length,
      skippedNoPhone,
      message: `Queued ${queueItems.length} WhatsApp payment notifications with a 5–10s random delay.`,
    };
  }

  async _processNotificationQueue(items) {
    logger.info(`[PartnerOrder] Starting WhatsApp payment notification queue (${items.length} items)...`);
    const io = getIO();

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Emit progress before sending
        if (io) {
          io.to('admins').emit('partner-order:notification-progress', {
            type: 'in_progress',
            total: items.length,
            current: i + 1,
            sent: sentCount,
            failed: failedCount,
            item: {
              orderId: item.orderIdStr,
              partnerName: item.partnerName,
              dueAmount: item.dueAmount,
              mobile: item.mobileNumber,
            },
          });
        }

        // Send via WhatsApp service
        await whatsappService.sendTextMessage(item.mobileNumber, item.message);

        // Update database notification tracking
        await PartnerOrder.findByIdAndUpdate(item.orderId, {
          $inc: { notificationCount: 1 },
          lastNotificationAt: new Date(),
        });

        sentCount++;
        logger.info(
          `[PartnerOrder] Sent notification ${i + 1}/${items.length} to ${item.partnerName} (${item.mobileNumber})`
        );
      } catch (err) {
        failedCount++;
        logger.error(
          `[PartnerOrder] Failed notification to ${item.partnerName} (${item.mobileNumber}): ${err.message}`
        );
      }

      // Random delay between 5 to 10 seconds (5000ms - 10000ms) before sending next message
      if (i < items.length - 1) {
        const randomDelay = Math.floor(Math.random() * 5000) + 5000;
        logger.info(`[PartnerOrder] Waiting ${(randomDelay / 1000).toFixed(1)}s before next message...`);

        if (io) {
          io.to('admins').emit('partner-order:notification-progress', {
            type: 'cooldown',
            total: items.length,
            current: i + 1,
            sent: sentCount,
            failed: failedCount,
            cooldownMs: randomDelay,
          });
        }

        await sleep(randomDelay);
      }
    }

    // Final complete event
    logger.info(
      `[PartnerOrder] Notification queue finished. Sent: ${sentCount}, Failed: ${failedCount}`
    );
    if (io) {
      io.to('admins').emit('partner-order:notification-progress', {
        type: 'completed',
        total: items.length,
        sent: sentCount,
        failed: failedCount,
      });
    }
  }
}

export const partnerOrderService = new PartnerOrderService();
