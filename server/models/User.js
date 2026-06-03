const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['resident', 'planner', 'admin'], default: 'resident' },
  location: { type: Object },
  department: { type: String },
  employeeId: { type: String },
  idProof: {
    filename: { type: String },
    path: { type: String },
    mimetype: { type: String },
    size: { type: Number }
  },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
});

// Compare password method (plain text comparison)
userSchema.methods.comparePassword = function (candidatePassword) {
  return this.password === candidatePassword;
};

module.exports = mongoose.model('User', userSchema);