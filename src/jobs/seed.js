import '../config/env.js';
import { connectDB } from '../config/database.js';
import { User, Role, Setting, RechargeProvider } from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { ROLE_PERMISSIONS } from '../constants/permissions.js';
import { PROVIDER_CODES } from '../constants/provider.js';
import logger from '../config/logger.js';

const seedRoles = async () => {
  const roleDefs = [
    { name: ROLES.SUPER_ADMIN, displayName: 'Super Admin', description: 'Full system access', permissions: ROLE_PERMISSIONS.super_admin, isSystem: true },
    { name: ROLES.ADMIN, displayName: 'Admin', description: 'Admin access', permissions: ROLE_PERMISSIONS.admin, isSystem: true },
    { name: ROLES.RETAILER, displayName: 'Retailer', description: 'Retailer access', permissions: ROLE_PERMISSIONS.retailer, isSystem: true },
  ];

  for (const roleDef of roleDefs) {
    await Role.findOneAndUpdate({ name: roleDef.name }, roleDef, { upsert: true, new: true });
  }
  logger.info('Roles seeded');
};

const seedSuperAdmin = async () => {
  const exists = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (exists) {
    logger.info('Super admin already exists');
    return;
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@rechargecrmapp.com',
    phone: process.env.SUPER_ADMIN_PHONE || '9000000000',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345',
    role: ROLES.SUPER_ADMIN,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const { Wallet } = await import('../models/index.js');
  const wallet = await Wallet.create({ user: admin._id, walletLimit: 10000000 });
  await User.findByIdAndUpdate(admin._id, { wallet: wallet._id });

  logger.info('Super admin seeded', { email: admin.email });
};

const seedSettings = async () => {
  const settings = [
    { key: 'wallet.defaultLimit', value: 100000, displayName: 'Default Wallet Limit', group: 'wallet', dataType: 'number', isPublic: false },
    { key: 'wallet.minRechargeAmount', value: 10, displayName: 'Min Recharge Amount', group: 'wallet', dataType: 'number', isPublic: true },
    { key: 'wallet.maxRechargeAmount', value: 10000, displayName: 'Max Recharge Amount', group: 'wallet', dataType: 'number', isPublic: true },
    { key: 'wallet.commissionRate', value: 0.02, displayName: 'Default Commission Rate', group: 'wallet', dataType: 'number', isPublic: false },
    { key: 'recharge.retryEnabled', value: true, displayName: 'Retry Enabled', group: 'recharge', dataType: 'boolean', isPublic: false },
    { key: 'recharge.maxRetries', value: 3, displayName: 'Max Retry Attempts', group: 'recharge', dataType: 'number', isPublic: false },
    { key: 'app.maintenanceMode', value: false, displayName: 'Maintenance Mode', group: 'general', dataType: 'boolean', isPublic: true },
    { key: 'app.supportEmail', value: 'support@rechargecrmapp.com', displayName: 'Support Email', group: 'general', dataType: 'string', isPublic: true },
    { key: 'app.supportPhone', value: '1800-xxx-xxxx', displayName: 'Support Phone', group: 'general', dataType: 'string', isPublic: true },
  ];

  for (const setting of settings) {
    await Setting.findOneAndUpdate({ key: setting.key }, setting, { upsert: true, new: true });
  }
  logger.info('Settings seeded');
};

const seedProvider = async () => {
  const exists = await RechargeProvider.findOne({ code: PROVIDER_CODES.MROBOTICS });
  if (exists) {
    logger.info('MRobotics provider already exists');
    return;
  }

  await RechargeProvider.create({
    name: 'MRobotics',
    code: PROVIDER_CODES.MROBOTICS,
    baseUrl: process.env.MROBOTICS_BASE_URL || 'https://api.mrobotics.in',
    apiKey: process.env.MROBOTICS_API_KEY || '',
    apiSecret: process.env.MROBOTICS_API_SECRET || '',
    memberId: process.env.MROBOTICS_MEMBER_ID || '',
    status: 'ACTIVE',
    priority: 1,
    isDefault: true,
    timeoutMs: 30000,
    retryCount: 3,
    retryDelayMs: 1000,
    supportedTypes: ['MOBILE_PREPAID', 'MOBILE_POSTPAID', 'DTH', 'BROADBAND'],
  });
  logger.info('MRobotics provider seeded');
};

const run = async () => {
  await connectDB();
  await seedRoles();
  await seedSuperAdmin();
  await seedSettings();
  await seedProvider();
  logger.info('Seeding complete');
  process.exit(0);
};

run().catch((err) => {
  logger.error('Seed failed', { error: err.message });
  process.exit(1);
});
