import path from 'path';
import winston, { Logger } from 'winston';

const logHandler: Logger = winston.createLogger(getLogConfig('info'));
export default logHandler;

export class LogMetaData {
    module: string;
    timestamp: string;
    error: Error;

    constructor(module: string, error?: Error) {
        this.module = module;
        this.timestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        if (error) {
            this.error = error;
        }
    }
}

export function getLogConfig(level: string) {
    return {
        level: level,
        format: winston.format.json(),
        transports: [
            new winston.transports.File({
                filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
                level: 'error',
                maxsize: 10485760,
                maxFiles: 10
            }),
            new winston.transports.File({
                filename: path.join(__dirname, '..', '..', 'logs', 'main.log'),
                maxsize: 10485760,
                maxFiles: 10
            }),
            new winston.transports.Console({
                format: winston.format.simple()
            })
        ]
    };
}