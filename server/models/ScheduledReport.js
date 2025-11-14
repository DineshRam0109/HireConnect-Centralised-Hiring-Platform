import mongoose from 'mongoose';

const scheduledReportSchema = new mongoose.Schema({
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
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  time: {
    type: String,
    required: true
  },
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  recipients: [{
    type: String
  }],
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    default: 'pdf'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastRun: Date,
  nextRun: Date
}, {
  timestamps: true
});

const ScheduledReport = mongoose.model('ScheduledReport', scheduledReportSchema);
export default ScheduledReport;