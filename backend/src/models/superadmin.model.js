import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const superAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
    },
    role: {
      required: true,
      type: String,
      enum: ["superadmin"],
      default: 'superadmin',
    },
    tokens: [{
      token: {
        type: String,
        required: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
superAdminSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// Generate auth token
superAdminSchema.methods.generateAuthToken = async function () {
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
superAdminSchema.statics.findByCredentials = async (email, password) => {
  const user = await SuperAdmin.findOne({ email });
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
superAdminSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

superAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);
export default SuperAdmin; 