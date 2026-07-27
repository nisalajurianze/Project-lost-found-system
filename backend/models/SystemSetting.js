import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    match: [/^[a-z0-9_]+$/, 'Setting key may contain only lowercase letters, digits, and underscores'],
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

systemSettingSchema.index({ key: 1, isPublic: 1 });

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
