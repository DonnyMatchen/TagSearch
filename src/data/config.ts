export class HTTPConfig {
    enabled: boolean;
    port: number;
}
export class TLSConfig {
    key: string;
    cert: string;
}
export class HTTPSConfig extends HTTPConfig {
    tls: TLSConfig;
}
export class SessionConfig {
    secret: string;
}
export class LogConfig {
    level: string;
}

export class MainConfig {
    http: HTTPConfig;
    https: HTTPSConfig;
    session: SessionConfig;
    logging: LogConfig;

    static getDefaultConfig(): MainConfig {
        return {
            http: {
                enabled: true,
                port: 8080
            },
            https: {
                enabled: false,
                port: 8443,
                tls: {
                    key: 'server.key',
                    cert: 'server.pem'
                }
            },
            session: {
                secret: 'CHANGE THIS ASAP!'
            },
            logging: {
                level: 'info'
            }
        };
    }
}

export class DBConfig {
    username: string;
    password: string;
    host: string;
    port: number;
    database: string;

    static getDefaultConfig(): DBConfig {
        return {
            username: 'postgres',
            password: '',
            host: 'localhost',
            port: 5432,
            database: 'postgres'
        };
    }
}