/**
 * Environment-aware logging.
 * - log / debug: no-op in production builds
 * - warn / error: always emit
 */

const isProd = import.meta.env.PROD === true;

function emit(method, args) {
  console[method](...args);
}

export const logger = {
  log(...args) {
    if (!isProd) emit('log', args);
  },
  debug(...args) {
    if (!isProd) emit('debug', args);
  },
  warn(...args) {
    emit('warn', args);
  },
  error(...args) {
    emit('error', args);
  },
};

export default logger;
