import express, { Express } from "express";
import dotenv from "dotenv";
import path from "path";
import bodyParser from "body-parser";
import session from 'express-session';
import fileUpload from 'express-fileupload';

import Data, { DataHandler, User } from "@rt/data";
import InMem from "@dh/inmem";
import PGDB from "@dh/pgdb";
import getArguments, { Arguments } from "@utl/getArguments";
import { prep } from "@utl/appColor";

import search from "@pg/search";
import item from "@pg/item";
import tag from "@pg/tag";
import post from "@pg/post";
import deleter from "@pg/delete";
import userCenter from "@pg/userCenter";
import login from "@pg/login";
import api from "@pg/api";
import config from "@pg/config";

declare module "express-session" {
    interface SessionData {
      user: User;
    }
}

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const secret = process.env.SESSION_SECRET || 'You should set a session secret.';
Arguments.url = process.env.BASE_URL || `http://localhost:${port}`
prep();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(fileUpload({
    // Configure file uploads with maximum file size 10MB
    limits: { fileSize: 20 * 1024 * 1024 },
  
    // Temporarily store uploaded files to disk, rather than buffering in memory
    useTempFiles : true,
    tempFileDir : '/tmp/tag-search/'
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
        genid: function(req) {
            return dataHandler.generateSessionID();
        }
    }));
    
    app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.render('index', getArguments(
            req.session.user,
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
        res.send({
            'body': req.body,
            'files': req.files,
        });
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
    
    app.listen(port, () => {
        console.log(`[Server:Main] Server is running at http://localhost:${port}`);
    });
});