'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const config     = require('./config');
const apiRoutes  = require('./routes/api');
const { sendError } = require('./utils/helpers');

const app = express();


app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {

    if (!origin) return callback(null, true);


    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    const isFileOrigin = origin === 'null';
 
    const isAllowed = config.allowedOrigins.includes(origin);

    if (isLocalhost || isFileOrigin || isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false,
}));


app.options('*', cors());


app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));


if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}


app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
}));


app.set('trust proxy', 1);


app.use('/api', apiRoutes);


app.get('/', (req, res) => {
  res.json({
    name:    'RadioCom API',
    version: '1.0.0',
    status:  'running',
    docs:    'See README.md for endpoint documentation.',
  });
});

app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found.`, 404);
});


app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) {
    return sendError(res, err.message, 403);
  }
  console.error('[UNHANDLED ERROR]', err);
  sendError(res, 'An unexpected server error occurred.', 500);
});

app.listen(config.port, () => {
  console.log('\n🚀  RadioCom API Server');
  console.log(`    Environment : ${config.nodeEnv}`);
  console.log(`    Port        : ${config.port}`);
  console.log(`    Base URL    : http://localhost:${config.port}/api`);
  console.log('\n📡  Endpoints:');
  console.log(`    POST  http://localhost:${config.port}/api/signup`);
  console.log(`    POST  http://localhost:${config.port}/api/contact`);
  console.log(`    POST  http://localhost:${config.port}/api/subscribe`);
  console.log(`    POST  http://localhost:${config.port}/api/unsubscribe`);
  console.log(`    GET   http://localhost:${config.port}/api/health`);
  console.log('\n📂  Database: ./db/radiocom.sqlite');
  console.log('─'.repeat(50) + '\n');
});

module.exports = app; 
