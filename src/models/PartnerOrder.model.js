import mongoose from 'mongoose';

const partnerOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      trim: true,
      index: true,
    },
    orderTime: {
      type: String,
      trim: true,
      default: '',
    },
    orderDate: {
      type: String,
      trim: true,
      default: '',
    },
    partnerName: {
      type: String,
      required: [true, 'Partner Name is required'],
      trim: true,
    },
    orderAmount: {
      type: Number,
      required: [true, 'Order Amount is required'],
      min: [0, 'Order Amount cannot be negative'],
    },
    partnerPrmId: {
      type: String,
      required: [true, 'Partner PRM ID is required'],
      trim: true,
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid Amount cannot be negative'],
    },
    dueAmount: {
      type: Number,
      default: function () {
        const netPayable = Math.round((this.orderAmount || 0) * 0.97 * 100) / 100;
        return Math.max(0, Math.round((netPayable - (this.paidAmount || 0)) * 100) / 100);
      },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid'],
      default: 'pending',
      index: true,
    },
    lastNotificationAt: {
      type: Date,
      default: null,
    },
    notificationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound unique index ensuring identical Order ID + Partner PRM ID is never duplicated
partnerOrderSchema.index({ orderId: 1, partnerPrmId: 1 }, { unique: true });
partnerOrderSchema.index({ partnerPrmId: 1, createdAt: -1 });
partnerOrderSchema.index({ dueAmount: 1 });

// Pre-save hook to ensure dueAmount and paymentStatus remain consistent (3% retailer commission)
partnerOrderSchema.pre('save', function (next) {
  const orderAmt = Number(this.orderAmount) || 0;
  const netPayable = Math.round(orderAmt * 0.97 * 100) / 100;
  const paidAmt = Number(this.paidAmount) || 0;
  this.dueAmount = Math.max(0, Math.round((netPayable - paidAmt) * 100) / 100);

  if (paidAmt >= netPayable && netPayable > 0) {
    this.paymentStatus = 'paid';
  } else if (paidAmt > 0) {
    this.paymentStatus = 'partially_paid';
  } else {
    this.paymentStatus = 'pending';
  }
  next();
});

const PartnerOrder = mongoose.model('PartnerOrder', partnerOrderSchema);
export default PartnerOrder;
