import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import SuperAdmin from '../models/superadmin.model.js';
import Stylist from '../models/stylist.model.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = {}
    if (decoded.role === "stylist") {
      user = await Stylist.findById({ _id: decoded.id });
    } else {
      user = await User.findById({ _id: decoded.id });
    }

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};


export const superAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const superAdmin = await SuperAdmin.findById({ _id: decoded.id });

    if (!superAdmin) {
      throw new Error();
    }

    req.token = token;
    req.user = superAdmin;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    next();
  };
};

export { authorize }; 