const fs = require('fs');
const path = require('path');
const db = require('../config/db');
require('dotenv').config();


const LOGS_FOLDER = process.env.LOGS_FOLDER;
const LOGS_PATHS = process.env.LOGS_PATHS;


const createLogger = ({ app, name, user, type = 'info' }) => {
    const now = new Date();

    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const HH = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    const fileTag = `${yyyy}${MM}${dd}-${HH}${mm}${ss}-${app}-${type}-${user}`;
    const filename = `${fileTag}.log`;
    const fullPath = path.join(__dirname, '..', LOGS_FOLDER, filename);
    const relativePath = `${LOGS_PATHS}/${filename}`;

    const logsDir = path.join(__dirname, '..', LOGS_FOLDER);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logsCache = [];

    const log = async (message, flush = false) => {
        const nowLine = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${nowLine.getFullYear()}-${pad(nowLine.getMonth() + 1)}-${pad(nowLine.getDate())} ${pad(nowLine.getHours())}:${pad(nowLine.getMinutes())}:${pad(nowLine.getSeconds())}`;

        const line = `[${ts}] [${type.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(fullPath, line);
        logsCache.push(line);

        if (flush) {
            const lastEntry = logsCache.at(-1)?.trim() || '';
            await db.query(`
                INSERT INTO logs (app, name, username, type, output, path)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [app, name, user, type, lastEntry, relativePath]);
        }
    };

    return log;
};

module.exports = createLogger;