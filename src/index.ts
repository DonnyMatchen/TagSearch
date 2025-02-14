import bodyParser from 'body-parser';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

import { PersonalConfig, User } from "@da/user";
import DataHandler from "@dh/dataHandler";
import PGDB, { DBConfig } from "@dh/pgdb";
import getArguments from "@utl/getArguments";

import api from "@rt/api";
import config from "@rt/config";
import deleter from "@rt/delete";
import item from "@rt/item";
import login from "@rt/login";
import post from "@rt/post";
import search from "@rt/search";
import tag from "@rt/tag";
import userCenter from "@rt/userCenter";

declare module "express-session" {
    interface SessionData {
        user: User;
        config: PersonalConfig;
    }
}

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

let httpEnabled: boolean = true;
let httpsEnabled: boolean = true;
let httpPort: number = 80;
let httpsPort: number = 443;
let tlsKey: string = 'server.key';
let tlsCert: string = 'server.pem';
let secret: string = 'CHANGE ME!';

let dataHandler: DataHandler;

new Promise<any>((resolve, reject) => {
    fs.readFile(path.join(__dirname, '..', 'config', 'main.json'), 'utf-8', (error, data) => {
        if (error) {
            reject(error);
        } else {
            resolve(JSON.parse(data));
        }
    });
}).then(cfg => {
    httpEnabled = cfg.http.enabled;;
    if (httpEnabled) {
        httpPort = cfg.http.port;
    }
    httpsEnabled = cfg.https.enabled;;
    if (httpsEnabled) {
        httpsPort = cfg.https.port;
        tlsKey = cfg.https.tls.key;
        tlsCert = cfg.https.tls.cert;
    }
    secret = cfg.session.secret;
}).then(() => {
    return new Promise<DBConfig>((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', 'config', 'db.json'), 'utf-8', (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}).then(cfg => {
    dataHandler = new PGDB(cfg);
    return dataHandler.init();
}).then(() => {
    return dataHandler.ensureAdmin();;
}).then(() => {
    return dataHandler.ensureDefaultType();
}).then(() => {
    app.use(session({
        secret: secret,
        resave: false,
        saveUninitialized: true,
        genid: function (req) {
            return dataHandler.generateSessionID();
        }
    }));
    if (secret == 'You should set a session secret.') {
        console.log(`[Server:Main] ${secret}`);
    }

    app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.render('index', getArguments(
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
        ))
    });

    app.get('/logout', (req, res) => {
        req.session.user = undefined;
        res.redirect('/search');
    });

    app.get('/test', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.join(__dirname, 'test.html'));
    });
    app.post('/test', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let o = {
            'body': req.body,
            'files': req.files,
        };
        console.log(JSON.stringify(o));
        res.send(o);
    });

    app.use(express.static(path.join(__dirname, "public")));

    app.use("/search", search(dataHandler));
    app.use("/item", item(dataHandler));
    app.use("/tag", tag(dataHandler));
    app.use("/post", post(dataHandler));
    app.use("/delete", deleter());
    app.use('/userCenter', userCenter(dataHandler));
    app.use('/login', login(dataHandler));
    app.use('/api', api(dataHandler));
    app.use('/config', config(dataHandler));

    if (httpEnabled) {
        let httpServ = http.createServer(app);
        httpServ.listen(httpPort, () => {
            console.log(`[Server:Main] HTTP Server is running at http://localhost:${httpPort}`);
        });
    }

    if (httpsEnabled) {
        let cred = { key: '', cert: '' };
        new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(__dirname, 'tlsCert', tlsKey), 'utf8', (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        }).then(key => {
            cred.key = key;
            return new Promise<string>((resolve, reject) => {
                fs.readFile(path.join(__dirname, 'tlsCert', tlsCert), 'utf8', (error, data) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(data);
                    }
                });
            });
        }, (error: Error) => {
            console.log(`[Server:Main] Unable to load TLS key because: ${error.message}`);
        }).then(cert => {
            if (cert) {
                cred.cert = cert;
                if (cred.key && cred.cert) {
                    let httpsServ = https.createServer(cred, app);
                    httpsServ.listen(httpsPort, () => {
                        console.log(`[Server:Main] HTTPS Server is running at https://localhost:${httpsPort}`);
                    });
                }
            }
        }, (error: Error) => {
            console.log(`[Server:Main] Unable to load TLS cert because: ${error.message}`);
        });
    }
});