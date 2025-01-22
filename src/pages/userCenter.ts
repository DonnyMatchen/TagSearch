import express, { Router } from "express";

import { DataHandler } from "@rt/data";
import getArguments, { Arguments } from "@utl/getArguments";

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
                {
                    active: true,
                    pageURL: `${Arguments.url}/userCenter?username=&page=`,
                    pageCount: 0,
                    pageNumber: 0
                },
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
                    4,
                    `${results.total} result(s) matching "${search}"`,
                    '',
                    {
                        active: true,
                        pageURL: `${Arguments.url}/userCenter?username=${search}&page=`,
                        pageCount: results.pageCount,
                        pageNumber: +page
                    },
                    {
                        results: results.results,
                        userSearch: search
                    }
                ));
            });
        }
    });

    return router;
}