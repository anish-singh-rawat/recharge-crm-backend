import { ekoRequest } from './client.js';
import { providerLogger } from '../../../config/logger.js';

function normalizePlan(raw) {
  const amount = parseFloat(raw.rs ?? raw.price ?? raw.amount ?? 0);
  if (!amount || isNaN(amount)) return null;

  const validity = String(raw.validity ?? raw.valid_for ?? '').trim();
  const description = String(
    raw.description ?? raw.desc ?? raw.plan_name ?? raw.planname ?? ''
  ).trim();

  const dataRaw = String(
    raw.data ?? raw.data_benefit ?? raw.internet ?? raw.mb ?? ''
  ).trim();

  const talktime = parseFloat(raw.talk_time ?? raw.talktime ?? raw.tt ?? 0) || 0;

  const smsRaw = String(raw.sms ?? raw.sms_benefit ?? '').trim();
  const smsCount = parseInt(smsRaw, 10) || 0;

  const planType = normalizePlanType(raw.pack_type ?? raw.type ?? raw.plan_type ?? '');

  return {
    amount,
    validity: validity || '',
    description: description || '',
    dataAmount: dataRaw || '',
    talktime,
    smsCount,
    planType,
    isPopular: false,
  };
}

function normalizePlanType(raw) {
  const val = String(raw).toUpperCase();
  if (val.includes('DATA') || val.includes('INTERNET')) return 'DATA';
  if (val.includes('ANNUAL') || val.includes('YEARLY') || val.includes('365')) return 'ANNUAL';
  if (val.includes('COMBO') || val.includes('FULL') || val.includes('ALL')) return 'TOPUP';
  if (val.includes('SMS')) return 'TOPUP';
  if (val.includes('ROAMING')) return 'TOPUP';
  if (val.includes('TOPUP') || val.includes('TOP UP')) return 'TOPUP';
  return 'TOPUP';
}

function extractPlansFromResponse(data) {
  if (!data) return [];

  if (Array.isArray(data)) {
    if (data.length > 0 && (data[0].rs !== undefined || data[0].amount !== undefined || data[0].price !== undefined)) {
      return data;
    }
    const nested = [];
    for (const item of data) {
      if (item.plans && Array.isArray(item.plans)) nested.push(...item.plans);
      else if (item.plan_list && Array.isArray(item.plan_list)) nested.push(...item.plan_list);
      else if (item.data && Array.isArray(item.data)) nested.push(...item.data);
    }
    return nested;
  }

  if (data.data && Array.isArray(data.data)) return extractPlansFromResponse(data.data);
  if (data.plans && Array.isArray(data.plans)) return extractPlansFromResponse(data.plans);
  if (data.plan_list && Array.isArray(data.plan_list)) return extractPlansFromResponse(data.plan_list);

  return [];
}

export const ekoPlanService = {
  async getPlans({ operatorCode, circleCode, mobileNumber = '9999999999' }) {
    const endpoint = `/ekoapi/v3/customer/payment/bbps/recharge/${mobileNumber}/operator/plans`;

    const raw = await ekoRequest({
      endpoint,
      params: {
        phone_operator_code: operatorCode,
        circleid: circleCode,
      },
    });

    if (!raw) {
      providerLogger.warn('Eko plans: empty response', { operatorCode, circleCode });
      return [];
    }

    const isSuccess =
      raw.status === 0 ||
      raw.status === '0' ||
      raw.response_status_id === 0 ||
      raw.response_status_id === '0' ||
      String(raw.message ?? '').toLowerCase().includes('success');

    if (!isSuccess && raw.status !== undefined && raw.status !== 0) {
      providerLogger.warn('Eko plans: non-success response', {
        operatorCode,
        circleCode,
        status: raw.status,
        message: raw.message,
      });
      return [];
    }

    const rawPlans = extractPlansFromResponse(raw.data ?? raw.plans ?? raw);
    const normalized = rawPlans.map(normalizePlan).filter(Boolean);

    providerLogger.info('Eko plans fetched', {
      operatorCode,
      circleCode,
      raw: rawPlans.length,
      normalized: normalized.length,
    });

    return normalized;
  },
};
