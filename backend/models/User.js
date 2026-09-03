import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'], index: true },
  phone: { type: String, trim: true, default: '' },
  studentId: { type: String, sparse: true, unique: true, uppercase: true, trim: true, set: (v) => (v ? v : undefined) },
  password: { type: String, required: false, minlength: 12, select: false },
  googleId: { type: String, sparse: true, unique: true, select: false },
  authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
  profileImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, select: false },
  notificationPreferences: {
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    smartMatchesEnabled: { type: Boolean, default: true },
    minimumMatchConfidence: { type: Number, min: 50, max: 95, default: 75 },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00', match: /^([01]\d|2[0-3]):[0-5]\d$/u },
      end: { type: String, default: '07:00', match: /^([01]\d|2[0-3]):[0-5]\d$/u },
      timezone: { type: String, enum: ['Asia/Colombo'], default: 'Asia/Colombo' },
    },
    categories: {
      matches: { type: Boolean, default: true },
      claims: { type: Boolean, default: true },
      handover: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
  },
  isVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationTokenExpire: { type: Date, select: false },
  resetPasswordTokenHash: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  lastLogin: { type: Date, default: null },
  isActive: { type: Boolean, default: true, index: true },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, default: null, select: false },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return this.password ? bcrypt.compare(candidatePassword, this.password) : false;
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  for (const key of [
    'password', 'googleId', 'verificationTokenHash', 'verificationTokenExpire',
    'resetPasswordTokenHash', 'resetPasswordExpire', 'loginAttempts', 'lockUntil',
    'pushSubscription', '__v'
  ]) delete obj[key];
  return obj;
};

userSchema.virtual('isLocked').get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
});

export default mongoose.model('User', userSchema);
