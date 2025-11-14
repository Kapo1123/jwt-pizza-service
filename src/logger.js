const config = require('./config.js');
const Logger = require('pizza-logger');

// Create a logger instance with Grafana configuration if available
// Disable logging during tests to avoid interference
let logger;
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (config.logging && config.logging.url && !isTestEnvironment) {
  logger = new Logger(config.logging);
} else {
  // Create a no-op logger for testing/development when config is not available
  logger = {
    httpLogger: (req, res, next) => next(),
    dbLogger: () => {},
    factoryLogger: () => {},
    unhandledErrorLogger: () => {},
  };
}

module.exports = logger;