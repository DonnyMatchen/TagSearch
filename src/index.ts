import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

import { DBConfig, MainConfig } from "@da/config";
import { PersonalConfig, User } from "@da/user";
import DataHandler from "@dh/dataHandler";
import PGDB from "@dh/pgdb";
import getArguments from "@utl/getArguments";
import logHandler, { getLogConfig, LogMetaData } from '@utl/logHandler';

import api from "@rt/api";
import deleter from "@rt/delete";
import item from "@rt/item";
import login from "@rt/login";
import post from "@rt/post";
import search from "@rt/search";
import settings from "@rt/settings";
import tag from "@rt/tag";
import userCenter from "@rt/userCenter";

declare module "express-session" {
    interface SessionData {
        user: User;
        config: PersonalConfig;
    }
}

dotenv.config();

const app: Express = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(fileUpload({
    limits: { fileSize: 200 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/tag-search/'
}));

//variables that are used in multiple sections of the .then chain
let httpEnabled: boolean;
let httpsEnabled: boolean;
let httpPort: number;
let httpsPort: number;
let tlsKey: string;
let tlsCert: string;
let secret: string;
let dataHandler: DataHandler;
let initialized: boolean = false;

let def = MainConfig.getDefaultConfig();
let db = DBConfig.getDefaultConfig();

new Promise<MainConfig>((resolve, reject) => {
    fs.readFile(path.join(__dirname, '..', 'config', 'main.json'), 'utf-8', (error, data) => {
        if (error) {
            if (error.message.includes('no such file or directory')) {
                fs.writeFile(path.join(__dirname, '..', 'config', 'main.json'), JSON.stringify(def), (error) => {
                    if (error) {
                        logHandler.error('Failed to save default main config', new LogMetaData('main', error));
                    } else {
                        logHandler.info(`The default main config was written to ${path.join(__dirname, '..', 'config', 'main.json')}`, new LogMetaData('main'));
                    }
                });
                resolve(def);
            } else {
                logHandler.error(`Using default main config because the config file could not be loaded`, new LogMetaData('main', error));
                resolve(def);
            }
        } else {
            resolve(JSON.parse(data));
        }
    });
}).then(cfg => {
    if (cfg.http) {
        httpEnabled = cfg.http.enabled;;
        if (httpEnabled) {
            httpPort = cfg.http.port;
        }
    } else {
        httpEnabled = def.http.enabled;;
        if (httpEnabled) {
            httpPort = def.http.port;
        }
    }

    if (cfg.https) {
        httpsEnabled = cfg.https.enabled;;
        if (httpsEnabled) {
            httpsPort = cfg.https.port;
            tlsKey = cfg.https.tls.key;
            tlsCert = cfg.https.tls.cert;
        }
    } else {
        httpsEnabled = def.https.enabled;;
        if (httpsEnabled) {
            httpsPort = def.https.port;
            tlsKey = def.https.tls.key;
            tlsCert = def.https.tls.cert;
        }
    }

    if (cfg.session) {
        secret = cfg.session.secret;
    } else {
        secret = def.session.secret;
    }
    if (secret == 'CHANGE THIS ASAP!') {
        logHandler.warn(`You need to change your session secret.`, new LogMetaData('main'));
    }

    if (cfg.logging) {
        logHandler.configure(getLogConfig(cfg.logging.level));
    } else {
        logHandler.configure(getLogConfig(def.logging.level));
    }
}).then(() => {
    return new Promise<DBConfig>((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', 'config', 'db.json'), 'utf-8', (error, data) => {
            if (error) {
                if (error.message.includes('no such file or directory')) {
                    fs.writeFile(path.join(__dirname, '..', 'config', 'db.json'), JSON.stringify(db), (error) => {
                        if (error) {
                            logHandler.error('Failed to save default db config', new LogMetaData('main', error));
                        } else {
                            logHandler.info(`The default db config was written to ${path.join(__dirname, '..', 'config', 'db.json')}`, new LogMetaData('main'));
                        }
                    });
                    resolve(db);
                } else {
                    logHandler.error(`Using default db config because the config file could not be loaded`, new LogMetaData('main', error));
                    resolve(db);
                }
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}).then(cfg => {
    dataHandler = new PGDB(logHandler, cfg);
    return dataHandler.init();
}).then(() => {
    initialized = true;
    return dataHandler.ensureAdmin();;
}, (error: Error) => {
    logHandler.error(`Unable to initialize the PGDB link`, new LogMetaData('main', error));
}).then(() => {
    if (initialized) {
        return dataHandler.ensureDefaultType();
    }
}).then(() => {
    if (initialized) {
        app.use(session({
            secret: secret,
            resave: false,
            saveUninitialized: true,
            genid: function (req) {
                return dataHandler.generateSessionID();
            }
        }));

        app.get('/', (req, res) => {
            res.setHeader('Content-Type', 'text/html').status(200).render('index', getArguments(
                req.session.user,
                req.session.config,
                'Home',
                0,
                'Yes, the site is working.',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {}
            ));
        });

        app.get('/logout', (req, res) => {
            req.session.user = undefined;
            res.redirect('/search');
        });

        app.get('/test', (req, res) => {
            res.setHeader('Content-Type', 'text/html').status(200).sendFile(path.join(__dirname, 'test.html'));
        });
        app.post('/test', (req, res) => {
            let o = {
                'body': req.body,
                'files': req.files,
            };
            logHandler.verbose(JSON.stringify(o), new LogMetaData('main'));
            res.setHeader('Content-Type', 'application/json').status(200).send(o);
        });

        app.use(express.static(path.join(__dirname, "public")));

        app.use("/search", search(dataHandler));
        app.use("/item", item(dataHandler));
        app.use("/tag", tag(dataHandler));
        app.use("/post", post(dataHandler));
        app.use("/delete", deleter());
        app.use('/userCenter', userCenter(dataHandler));
        app.use('/login', login(dataHandler, logHandler));
        app.use('/api', api(dataHandler, logHandler));
        app.use('/settings', settings(dataHandler));

        app.all('*', (req, res) => {
            res.setHeader('Content-Type', 'text/html').status(404).render('index', getArguments(
                req.session.user,
                req.session.config,
                'Home',
                0,
                `The page you're looking for may not exit.`,
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {}
            ))
        });

        if (httpEnabled) {
            let httpServ = http.createServer(app);
            httpServ.listen(httpPort, () => {
                logHandler.info(`HTTP Server is running at http://localhost:${httpPort}`, new LogMetaData('main'));
            });
        }

        if (httpsEnabled) {
            let cred = { key: '', cert: '' };
            new Promise<string>((resolve, reject) => {
                fs.readFile(path.join(__dirname, '..', 'tlsCert', tlsKey), 'utf8', (error, data) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(data);
                    }
                });
            }).then(key => {
                cred.key = key;
                return new Promise<string>((resolve, reject) => {
                    fs.readFile(path.join(__dirname, '..', 'tlsCert', tlsCert), 'utf8', (error, data) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(data);
                        }
                    });
                });
            }, (error: Error) => {
                logHandler.error(`Unable to load TLS key`, new LogMetaData('main', error));
            }).then(cert => {
                if (cert) {
                    cred.cert = cert;
                    if (cred.key && cred.cert) {
                        let httpsServ = https.createServer(cred, app);
                        httpsServ.listen(httpsPort, () => {
                            logHandler.info(`HTTPS server is running at https://localhost:${httpsPort}`, new LogMetaData('main'));
                        });
                    }
                }
            }, (error: Error) => {
                logHandler.error(`Unable to load TLS cert`, new LogMetaData('main', error));
            });
        }
    } else {
        logHandler.error(`The server could not start because the data handler was not initialized`, new LogMetaData('main'));
    }
});