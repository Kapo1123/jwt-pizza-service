const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const userRouter = require('./routes/userRouter.js');
const version = require('./version.json');
const config = require('./config.js');
const metrics = require('./metrics.js');
const logger = require('./logger.js');

const app = express();
app.use(express.json());
app.use(logger.httpLogger);

// Metrics middleware - must be before setAuthUser to track all requests
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Increment request counter
  metrics.incrementRequest(req.method);
  
  // Override res.json and res.send to capture response
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  const captureResponse = () => {
    const latency = Date.now() - startTime;
    
    // Record latency for all requests
    if (req.path.includes('/api/order') && req.method === 'POST') {
      metrics.recordLatency('pizza', latency);
    } else {
      metrics.recordLatency('all', latency);
    }
  };
  
  res.json = function(data) {
    captureResponse();
    return originalJson(data);
  };
  
  res.send = function(data) {
    captureResponse();
    return originalSend(data);
  };
  
  next();
});

app.use(setAuthUser);

// Track active users after authentication
app.use((req, res, next) => {
  if (req.user && req.user.id) {
    metrics.trackActiveUser(req.user.id);
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.docs, ...userRouter.docs, ...orderRouter.docs, ...franchiseRouter.docs],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  logger.unhandledErrorLogger(err);
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
