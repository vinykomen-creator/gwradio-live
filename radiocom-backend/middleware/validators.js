'use strict';

const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/helpers');


const emailRule = body('email')
  .trim()
  .notEmpty().withMessage('Email address is required.')
  .isEmail().withMessage('Please enter a valid email address.')
  .normalizeEmail();

const firstNameRule = body('first_name')
  .trim()
  .notEmpty().withMessage('First name is required.')
  .isLength({ min: 2, max: 80 }).withMessage('First name must be 2–80 characters.')
  .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/).withMessage('First name contains invalid characters.');

const lastNameRule = body('last_name')
  .trim()
  .notEmpty().withMessage('Last name is required.')
  .isLength({ min: 2, max: 80 }).withMessage('Last name must be 2–80 characters.')
  .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/).withMessage('Last name contains invalid characters.');


const signupValidationRules = [
  firstNameRule,
  lastNameRule,
  emailRule,

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/).withMessage('Phone number format is invalid.'),

  body('interest')
    .optional({ checkFalsy: true })
    .trim()
    .isIn([
      'General Membership',
      'Training Programs',
      'Volunteering',
      'Partnerships',
      'Donations',
    ]).withMessage('Please select a valid interest.'),

  body('about')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('About text must be under 1,000 characters.'),

  body('agreed_terms')
    .custom(val => {
      // Accept boolean true, string "true", or integer 1
      if (val === true || val === 'true' || val === 1 || val === '1') return true;
      throw new Error('You must agree to the Terms & Conditions.');
    }),
];


const contactValidationRules = [
  firstNameRule,
  lastNameRule,
  emailRule,

  body('subject')
    .optional({ checkFalsy: true })
    .trim()
    .isIn([
      'General Inquiry',
      'Training Programs',
      'Events',
      'Partnerships',
      'Technical Support',
      'Press & Media',
    ]).withMessage('Please select a valid subject.'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10, max: 3000 })
    .withMessage('Message must be between 10 and 3,000 characters.'),
];


const newsletterValidationRules = [
  emailRule,

  body('source')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['footer', 'home', 'signup_page'])
    .withMessage('Invalid subscription source.'),
];

function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();


  const errors = result.array().map(err => ({
    field:   err.path || err.param,
    message: err.msg,
  }));

  return sendError(res, 'Validation failed. Please check the highlighted fields.', 422, errors);
}

module.exports = {
  signupValidationRules,
  contactValidationRules,
  newsletterValidationRules,
  handleValidationErrors,
};
