import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const errorLogFile = path.join(logsDir, 'error.log');

const getTimestamp = () => new Date().toISOString();
const formatMessage = (level, message) => `[${getTimestamp()}] [${level}] ${message}\n`;
const writeLog = (file, message) => fs.appendFileSync(file, message, 'utf8');

const serialize = (val) => {
  if (val instanceof Error) return `${val.message}\n${val.stack ?? ''}`;
  if (val && typeof val === 'object') { try { return JSON.stringify(val); } catch { return String(val); } }
  return val !== undefined ? String(val) : '';
};

export const logger = {
  info: (message, extra) => {
    const text = extra !== undefined ? `${message} ${serialize(extra)}` : String(message);
    console.log(text);
    writeLog(logFile, formatMessage('INFO', text));
  },
  error: (message, extra) => {
    const text = extra !== undefined ? `${message} ${serialize(extra)}` : String(message);
    console.error(text);
    writeLog(logFile,      formatMessage('ERROR', text));
    writeLog(errorLogFile, formatMessage('ERROR', text));
  },
  warn: (message, extra) => {
    const text = extra !== undefined ? `${message} ${serialize(extra)}` : String(message);
    console.warn(text);
    writeLog(logFile, formatMessage('WARN', text));
  },
  debug: (message, extra) => {
    if (process.env.NODE_ENV === 'development') {
      const text = extra !== undefined ? `${message} ${serialize(extra)}` : String(message);
      console.debug(text);
      writeLog(logFile, formatMessage('DEBUG', text));
    }
  },
};
