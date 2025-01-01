import express, { Express, Request, Response, Router } from "express";

import { DataHandler, SearchResults, User } from "@rt/data";
import getArguments from "@utl/getArguments";

export default function userCenter(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get('/', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render('layout', getArguments(
                req.session.user,
                'User Center',
                -1,
                `Access Denied`,
                '',
                ["delete"],
                {},
                ['You are not permitted to access user information.']
            ));
        } else {
            let search: string = <string>req.query.username;
            let page: string = <string>req.query.page;
            if(search == null) {
                search = '';
            }
            if(page == null) {
                page = '1';
            }
            dataHandler.searchUsers(search, dataHandler.getPageLimit(), +page).then(results => {
                res.render('user', getArguments(
                    req.session.user,
                    'Manage Center',
                    7,
                    `${results.total} result(s) matching "${search}"`,
                    search,
                    ['tagSearch'],
                    {
                        results: results.results,
                        userSearch: search,
                        pages: results.pageCount,
                        page: +page
                    }
                ));
            });
        }
    });

    return router;
}