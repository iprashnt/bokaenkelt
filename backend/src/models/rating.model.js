import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: "Anonymous",
    required: true
  },
  stylist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: mongoose.Schema.Types.Double,
    require: true,
  },
  review: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export const Rating = mongoose.model('Rating', ratingSchema);
export default Rating; 