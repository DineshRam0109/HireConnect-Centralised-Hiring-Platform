import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  metrics: [{
    type: String
  }],
  dateRange: {
    start: Date,
    end: Date
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    default: 'pdf'
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  fileUrl: String,
  fileSize: Number
}, {
  timestamps: true
});

const Report = mongoose.model('Report', reportSchema);
export default Report;