import { z } from 'zod';
import jwt from 'jsonwebtoken';
import express from 'express';
import User from '../models/user.model.js';
import Stylist from '../models/stylist.model.js';
import { auth, authorize } from '../middleware/auth.js';
import { mockStylists } from '../data/mockData.js';
import multer from 'multer';
import path from 'path';
import fs from "fs"
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from "uuid"

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesPath = path.join(__dirname, '../../images');


const coverImagestorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user._id;
    const userFolder = path.join(imagesPath, userId.toString());

    // Check if user-specific folder exists; if not, create it
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const fileName = `coverimage-${req.user._id}${extension}`;

    cb(null, fileName);
  }
});
const photosStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user._id;
    const userFolder = path.join(imagesPath, userId.toString());

    // Create folder if it doesn't exist
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const fileName = `photo-${uuidv4()}${extension}`;
    cb(null, fileName);
  }
});
const coverImageUpload = multer({ storage: coverImagestorage });
const photosUpload = multer({ storage: photosStorage });


// Validation schemas
const updateStylistSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional(),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2)
  }).optional(),
  profileImage: z.string().optional()
});
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

// Get all stylists
router.get('/', async (req, res) => {
  try {
    // In development, always return mock data
    if (process.env.NODE_ENV === 'development') {
      return res.json(mockStylists);
    }

    const stylists = await Stylist.find({ isActive: true });
    res.json(stylists);
  } catch (error) {
    console.error('Error fetching stylists:', error);
    // If database error, return mock data in development
    if (process.env.NODE_ENV === 'development') {
      return res.json(mockStylists);
    }
    res.status(500).json({ message: 'Error fetching stylists' });
  }
});

// Get stylist by ID
router.get('/:id', async (req, res) => {
  try {
    const stylist = await Stylist.findById(req.params.id, '-updatedAt -__v -createdAt');

    if (!stylist) {
      return res.status(404).json({ message: 'Stylist not found' });
    }

    return res.status(200).json({ status: "success", data: stylist });
  } catch (error) {
    console.error('Error fetching stylist:', error);
    res.status(500).json({ message: 'Error fetching stylist' });
  }
});

// Create new stylist
router.post('/', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return res.status(201).json({ message: 'Stylist created (mock)' });
    }

    const stylist = new Stylist(req.body);
    await stylist.save();
    res.status(201).json(stylist);
  } catch (error) {
    console.error('Error creating stylist:', error);
    res.status(400).json({ message: 'Error creating stylist', error: error.message });
  }
});

// Update stylist
router.put('/:id', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return res.json({ message: 'Stylist updated (mock)' });
    }

    const stylist = await Stylist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!stylist) {
      return res.status(404).json({ message: 'Stylist not found' });
    }
    res.json(stylist);
  } catch (error) {
    console.error('Error updating stylist:', error);
    res.status(400).json({ message: 'Error updating stylist', error: error.message });
  }
});

// Delete stylist (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return res.json({ message: 'Stylist deleted (mock)' });
    }

    const stylist = await Stylist.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!stylist) {
      return res.status(404).json({ message: 'Stylist not found' });
    }
    res.json({ message: 'Stylist deleted successfully' });
  } catch (error) {
    console.error('Error deleting stylist:', error);
    res.status(500).json({ message: 'Error deleting stylist' });
  }
});

// Update stylist profile
router.patch('/:id', auth, authorize('admin', 'stylist'), async (req, res) => {
  try {
    const validatedData = updateStylistSchema.parse(req.body);

    // Check if user has permission to update this profile
    if (req.user.role === 'stylist' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this profile'
      });
    }

    const stylist = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'stylist' },
      { $set: validatedData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!stylist) {
      return res.status(404).json({
        status: 'error',
        message: 'Stylist not found'
      });
    }

    res.json({
      status: 'success',
      data: { stylist }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Error updating stylist profile'
    });
  }
});

// Get stylists near location
router.get('/near/:postalCode', async (req, res) => {
  try {
    const { distance = 10000 } = req.query; // Default 10km radius
    const postalCode = req.params.postalCode;

    // Get coordinates for postal code (you would typically use a geocoding service)
    // This is a placeholder - you should implement proper geocoding
    const coordinates = await getCoordinatesFromPostalCode(postalCode);

    const stylists = await User.find({
      role: 'stylist',
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          $maxDistance: parseInt(distance)
        }
      }
    })
      .select('-password')
      .sort({ name: 1 });

    res.json({
      status: 'success',
      data: { stylists }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching nearby stylists'
    });
  }
});

// STYLIST LOGIN
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const stylist = await Stylist.findOne({ email: validatedData.email });
    if (!stylist) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await stylist.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: stylist._id, role: stylist.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: stylist._id,
        name: stylist.name,
        email: stylist.email,
        role: stylist.role,
        hasPremium: stylist.hasPremium
        // stylist: stylist.stylist,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Error logging in' });
  }
});


// UPDATE STYLIST PROFILE
router.post('/update/profile/coverimage', auth, coverImageUpload.single('coverimage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: "error", message: "Fail to upload cover image" });

    const updatedStylistProfile = await Stylist.findOneAndUpdate({ _id: req.user._id }, { imageUrl: `images/${req.user._id}/${req.file.filename}` });
    if (!updatedStylistProfile) return res.status(400).json({ status: "error", message: "Fail to save image url" });

    res.status(200).json({ status: "success", imageUrl: `images/${req.user._id}/${req.file.filename}` })
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: 'Server error' });
  }
});
router.post('/update/profile/photos', auth, photosUpload.array('photos', 5), async (req, res) => {
  try {
    const files = req.files;
    let photoStylist = null;

    if (!files || files.length === 0) {
      return res.status(400).json({ status: "error", message: "No photos uploaded" });
    }

    const uploadedPhotoPaths = files.map(file => `images/${req.user._id}/${file.filename}`);

    if (uploadedPhotoPaths.length > 0) {
      photoStylist = await Stylist.findOneAndUpdate({ _id: req.user._id }, { photos: uploadedPhotoPaths })
    }

    if (uploadedPhotoPaths.length <= 0 || !photoStylist) return res.status(400).json({ status: "error", message: "Fail to save photos" })

    res.status(200).json({ status: "success", photos: uploadedPhotoPaths })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/update/profile/images/delete/:imageName', auth, async (req, res) => {
  const { imageName } = req.params;
  const userId = req.user._id;

  if (!imageName) {
    return res.status(400).json({ status: "error", message: "Image name is required" });
  }

  try {
    const imagePath = path.join(__dirname, '../../images', userId.toString(), imageName);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ status: "error", message: "Image not found" });
    }

    // Delete the file
    fs.unlinkSync(imagePath);

    // Optional: remove reference from DB
    const stylistImages = await Stylist.findOneAndUpdate(
      { _id: userId },
      { $pull: { photos: `images/${userId}/${imageName}` } },
      { new: true }
    );

    if (!stylistImages) return res.status(400).json({ status: "error", message: "Fail to remove image in database" });

    res.status(200).json({ status: "success", message: "Image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Failed to delete image" });
  }
});
router.post('/update/profile', auth, async (req, res) => {
  const stylistProfileInfo = await Stylist.findOneAndUpdate({ _id: req.user._id }, { ...req.body });

  if (!stylistProfileInfo) return res.status(400).json({ status: "error", message: "Fail to update stylist profile" })

  res.status(200).send({ status: "success", message: 'Profile updated successfully' });
});

// Helper function to get coordinates from postal code
async function getCoordinatesFromPostalCode(postalCode) {
  // This is a placeholder - implement proper geocoding
  // You would typically use a service like Google Maps Geocoding API
  return [11.9746, 57.7089]; // Example coordinates for Gothenburg
}

export default router; 