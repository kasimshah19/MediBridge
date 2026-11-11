/**
 * Simple logger utility.
 * Can be replaced with winston/pino in production.
 */
const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  warn: (...args) => console.warn('⚠️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('🐛', ...args);
    }
  },
};

export default logger;

