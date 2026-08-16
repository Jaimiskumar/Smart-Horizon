import mongoose from 'mongoose';

const roadIssueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    issueType: {
      type: String,
      required: true,
      enum: ['Pothole', 'Under Construction', 'Roadblock', 'Damaged Signage', 'Water Logging', 'Other']
    },
    locationName: {
      type: String,
      required: true
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    description: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Reported', 'Verification', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Reported',
      index: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

roadIssueSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

export default mongoose.model('RoadIssue', roadIssueSchema);
