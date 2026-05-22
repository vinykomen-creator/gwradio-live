'use strict';

const router  = require('express').Router();
const rateLimit = require('express-rate-limit');

// Controllers
const { signup }       = require('../controllers/signupController');
const { contact }      = require('../controllers/contactController');
const { subscribe, unsubscribe, checkStatus } = require('../controllers/newsletterController');

// Validators
const {
  signupValidationRules,
  contactValidationRules,
  newsletterValidationRules,
  handleValidationErrors,
} = require('../middleware/validators');


const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many signup attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many contact requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'RadioCom API is running.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});


router.post(
  '/signup',
  signupLimiter,
  signupValidationRules,
  handleValidationErrors,
  signup
);


router.post(
  '/contact',
  contactLimiter,
  contactValidationRules,
  handleValidationErrors,
  contact
);


router.post(
  '/subscribe',
  newsletterLimiter,
  newsletterValidationRules,
  handleValidationErrors,
  subscribe
);


router.post(
  '/unsubscribe',
  newsletterLimiter,
  unsubscribe
);

router.get('/subscribe/check', checkStatus);

module.exports = router;
