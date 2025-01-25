import express, { Router } from "express";

import { DataHandler, User, UserState, SearchResults, PersonalConfig } from "@rt/data";
import { getCssVars } from "@utl/appColor";

export default function api(dataHandler: DataHandler): Router {
    const router: Router = express.Router();
    
    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send({
            'status': statuses.get(200),
            'messages': ['Server is up'],
            'errors': [],
            'returned': new SearchResults([], 0, 1, 1)
        });
    });

    router.get('/tags', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let search: string = <string>req.query.match;
        let page: string = <string>req.query.page;
        if (search == undefined) {
            res.send({
                'status': statuses.get(400),
                'messages': [],
                'errors':['invalid querry'],
                'returned': new SearchResults([], 0, 1, 1)
            });
        } else {
            if(page == undefined || Number.isNaN(+page)) {
                page = '1';
            }
            dataHandler.searchTags(search, 15, +page).then(tags => {
                let tagNames: string[] = [];
                for(let i = 0; i < tags.results.length; i++) {
                    tagNames.push(tags.results[i].name);
                }
                res.send({
                    'status': statuses.get(200),
                    'messages': [],
                    'errors': [],
                    'returned': new SearchResults(tagNames, tags.total, +page, tags.pageCount)
                });
            }, (error:Error) => {
                res.send({
                    'status': statuses.get(500),
                    'messages': [],
                    'errors': [error.message],
                    'returned': new SearchResults([], 0, 1, 1)
                });
            });
        }
    });

    router.get('/colors', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let config: PersonalConfig = User.getDefaultConfig();
        if (req.query.thm) {
            config.theme = +req.query.thm;
        }
        if (req.query.thmL) {
            config.themeLum = +req.query.thmL;
        }
        if (req.query.tagL) {
            config.tagLum = +req.query.tagL;
        }
        if (req.query.bad) {
            config.bad = +req.query.bad;
        }
        if (req.query.good) {
            config.good = +req.query.good;
        }
        if (req.query.dark) {
            config.dark = req.query.dark == 'yes';
        }
        res.send({
            'status': statuses.get(200),
            'messages': [],
            'errors': [],
            'returned': getCssVars(config)
        });
    });

    return router;
}

class Status {
    code: number;
    description: string;

    constructor(code: number, description: string) {
        this.code = code;
        this.description = description;
    }
}

const statuses: Map<number, Status> = new Map();
statuses.set(200, new Status(200, 'OK'));
statuses.set(400, new Status(400, 'Bad Request'));
statuses.set(500, new Status(500, 'Internal Server Error'));