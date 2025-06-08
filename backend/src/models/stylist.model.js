import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const stylistSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    default: ""
  },
  role: {
    type: String,
    trim: true,
    default: 'stylist'
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  specialties: {
    type: [String],
    trim: true,
    default: []
  },
  bio: {
    type: String,
    trim: true,
    default: ""
  },
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  reviews: {
    type: Number,
    min: 0,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  services: [{
    name: {
      type: String,
      trime: true
    },
    price: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    }
  }],
  availability: {
    days: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    hours: {
      start: {
        type: String,
        default: "10:00"
      },
      end: {
        type: String,
        default: "18:00"
      }
    }
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ""
  },
  location: {
    address: {
      type: String,
      trim: true,
      default: "N/A"
    },
    map: {
      type: String,
      trim: true,
      default: ""
    }
  },
  hasPremium: {
    type: Boolean,
    default: false
  },
  photos: {
    type: [String],
    trim: true,
    default: []
  },
  tabs: {
    type: [String],
    enum: ["Info", "Calendar", "Photos", "Reviews", "Contact"],
    default: ["Calendar", "Contact"]
  }
}, {
  timestamps: true
});

// Hash password before saving
stylistSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// Generate auth token
stylistSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(
    { _id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Find user by credentials
stylistSchema.statics.findByCredentials = async (email, password) => {
  const user = await Stylist.findOne({ email });
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  return user;
};

// Remove sensitive data when converting to JSON
stylistSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

stylistSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Stylist = mongoose.model('Stylist', stylistSchema);
export default Stylist; 