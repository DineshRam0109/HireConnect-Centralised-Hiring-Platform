import mongoose from 'mongoose';

const whiteLabelSettingsSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  companyLogo: {
    type: String,
    default: ''
  },
  primaryColor: {
    type: String,
    default: '#2196F3'
  },
  secondaryColor: {
    type: String,
    default: '#1976D2'
  },
  headerText: {
    type: String,
    default: 'Recruitment Analytics Report'
  },
  footerText: {
    type: String,
    default: 'Confidential - Internal Use Only'
  },
  showCompanyLogo: {
    type: Boolean,
    default: true
  },
  showGeneratedDate: {
    type: Boolean,
    default: true
  },
  customCss: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const WhiteLabelSettings = mongoose.model('WhiteLabelSettings', whiteLabelSettingsSchema);
export default WhiteLabelSettings;