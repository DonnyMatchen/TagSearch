import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

import PGDB from "@dh/pgdb";
import { DataHandler, PersonalConfig, User } from "@rt/data";
import getArguments from "@utl/getArguments";

import api from "@pg/api";
import config from "@pg/config";
import deleter from "@pg/delete";
import item from "@pg/item";
import login from "@pg/login";
import post from "@pg/post";
import search from "@pg/search";
import tag from "@pg/tag";
import userCenter from "@pg/userCenter";

declare module "express-session" {
    interface SessionData {
        user: User;
        config: PersonalConfig;
    }
}

dotenv.config();

const app: Express = express();
const httpPort = process.env.HTTP_PORT || 80;
const httpsPort = process.env.HTTPS_PORT || 443;
const tlsKey = process.env.TLS_KEY || 'server.key';
const tlsCert = process.env.TLS_CERT || 'server.pem';
const httpDisable = process.env.HTTP_DISABLED || 'false';
const httpsDisable = process.env.HTTPS_DISABLED || 'false';
const secret = process.env.SESSION_SECRET || 'You should set a session secret.';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(fileUpload({
    limits: { fileSize: 200 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/tag-search/'
}));

//HERE IS THE DATA HANDLER!
let dataHandler: DataHandler = new PGDB(process.env.PG_USER, process.env.PG_PASS, process.env.PG_HOST, +process.env.PG_PORT, process.env.PG_DB);
dataHandler.init().then(() => {
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

    if (httpDisable.toLowerCase() != 'true' && httpDisable.toLowerCase() != 't') {
        let httpServ = http.createServer(app);
        httpServ.listen(httpPort, () => {
            console.log(`[Server:Main] HTTP Server is running at http://localhost:${httpPort}`);
        });
    }

    if (httpsDisable.toLowerCase() != 'true' && httpsDisable.toLowerCase() != 't') {
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