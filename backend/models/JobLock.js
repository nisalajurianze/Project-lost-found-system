import mongoose from 'mongoose';

const jobLockSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true, maxlength: 200 },
  token: { type: String, required: true, maxlength: 100 },
  lockedUntil: { type: Date, required: true, index: true },
}, { timestamps: true });

export default mongoose.model('JobLock', jobLockSchema);
