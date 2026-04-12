import mongoose from 'mongoose';

const deliveryTripSchema = new mongoose.Schema(
  {
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    jobCards:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' }],
    
    deliveryTeam: [{
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name:    { type: String },
      phone:   { type: String },
      role:    { type: String }
    }],
    
    scheduledDate: { type: Date },
    timeSlot:      { type: String },
    
    status: {
      type: String,
      enum: ['scheduled', 'in_transit', 'delivered', 'cancelled'],
      default: 'scheduled'
    },
    
    proofOfDelivery: {
      photos:      [{ type: String }], // Array of podPhotoUrls
      signature:   { type: String },
      gpsLocation: { type: String },
      capturedAt:  { type: Date },
      notes:       { type: String }
    },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredByName: { type: String },
    actualDelivery: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('DeliveryTrip', deliveryTripSchema);
