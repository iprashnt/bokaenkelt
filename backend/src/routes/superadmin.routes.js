import { z } from 'zod';
import express from 'express';
import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/superadmin.model.js';
import Stylist from '../models/stylist.model.js';

import { superAuth } from '../middleware/auth.js';


const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['superadmin']),
});
const stylistSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

// Register Super Admin
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await SuperAdmin.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ status: "error", message: 'Email already registered' });
    }

    // Create new SuperAdmin
    const superAdmin = new SuperAdmin(validatedData);
    await superAdmin.save();

    // Generate token
    const token = jwt.sign(
      { id: superAdmin._id, role: superAdmin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });

  } catch (error) {
    console.error("error", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: error.errors[0].message });
    }
    res.status(500).json({ status: "error", message: 'Error creating user' });
  }
});

// Login SuperAdmin
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const superAdmin = await SuperAdmin.findOne({ email: validatedData.email });
    if (!superAdmin) {
      return res.status(401).json({ status: "error", message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await superAdmin.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ status: "error", message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: superAdmin._id, role: superAdmin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: error.errors[0].message });
    }
    res.status(500).json({ status: "error", message: 'Error logging in' });
  }
});

// Create Stylist Account
router.post('/stylist/add', superAuth, async (req, res) => {
  try {
    const validatedData = stylistSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await Stylist.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ status: "error", message: 'Email already registered' });
    }

    // Create new stylist
    const stylist = new Stylist(validatedData);
    await stylist.save();

    res.status(200).json({ status: "success", message: "Stylis created successfully" });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: error.errors[0].message });
    }
    res.status(500).json({ status: "error", message: 'Server Error' });
  }
});

// GET ALL STYLIST
router.get('/stylist/all', superAuth, async (req, res) => {
  try {
    const stylists = await Stylist.find({}, "-createdAt -updatedAt -__v");

    if (!stylists) {
      return res.status(400).json({ status: "error", message: 'Stylists not found', data: [] });
    }

    res.status(200).json({ status: "success", data: stylists });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: error.errors[0].message });
    }
    res.status(500).json({ status: "error", message: 'Server Error' });
  }
});

// DELETE STYLIST BY ID
router.delete('/stylist/delete/:id', superAuth, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(404).json({ status: "error", message: "Stylist id is required!" })

    const stylists = await Stylist.findOneAndDelete({ _id: id });

    if (!stylists) {
      return res.status(404).json({ status: "error", message: "Stylist not found!" })
    }

    res.status(200).json({ status: "success", message: "Stylist deleted successfully" });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: error.errors[0].message });
    }
    res.status(500).json({ status: "error", message: 'Server Error' });
  }
});




export default router; 