import mongoose from 'mongoose';

const partnerUserSchema = new mongoose.Schema(
  {
    partnerPrmId: {
      type: String,
      required: [true, 'Partner PRM ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    partnerName: {
      type: String,
      trim: true,
      default: '',
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PartnerUser = mongoose.model('PartnerUser', partnerUserSchema);
export default PartnerUser;
