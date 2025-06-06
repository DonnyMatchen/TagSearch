import express, { Router } from "express";
import { body, validationResult } from 'express-validator';
import { Logger } from "winston";

import { User, UserState } from "@da/user";
import DataHandler from "@dh/dataHandler";
import getArguments from "@utl/getArguments";
import { LogMetaData } from "@utl/logHandler";

export default function login(dataHandler: DataHandler, logHandler: Logger): Router {
    const router: Router = express.Router();

    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).render('login', getArguments(
            req.session.user,
            req.session.config,
            'Sign In',
            101,
            req.session.user == undefined ? '' : 'You are already logged in',
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
    router.post('/',
        body('uname')
            .notEmpty().withMessage('empty'),
        body('pass')
            .notEmpty().withMessage('empty'),
        (req, res) => {
            res.setHeader('Content-Type', 'text/html');
            let errorList = validationResult(req);
            let failure: boolean = false;
            let passBlank: boolean = false;
            errorList['errors'].forEach((error: any) => {
                if (error.path == 'uname') {
                    if (error.msg == 'empty') {
                        failure = true;
                    }
                } else if (error.path == 'pass') {
                    if (error.msg == 'empty') {
                        passBlank = true;
                    }
                }
            });
            let user: User;
            new Promise<User>((resolve, reject) => {
                if (!failure) {
                    resolve(dataHandler.getUser(req.body.uname))
                } else {
                    reject();
                }
            }).then(foundUser => {
                if (foundUser) {
                    user = foundUser;
                    if (foundUser.state == UserState.Set) {
                        return passBlank ? false : foundUser.check(req.body.pass);
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }
            }, (error: Error) => {
                return false;
            }).then(check => {
                if (check) {
                    logHandler.info(`Login for ${user.username} from host ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`, new LogMetaData('login'));
                    req.session.user = user;
                    req.session.config = user.config;
                    if (user.state == UserState.Set) {
                        res.redirect('/search');
                    } else {
                        res.redirect(`/login/set?username=${user.username}`);
                    }
                } else {
                    failure = true;
                }
            }).finally(() => {
                if (failure) {
                    res.status(200).render('login', getArguments(
                        req.session.user,
                        req.session.config,
                        'Sign In',
                        101,
                        req.session.user == undefined ? '' : 'You are already logged in',
                        '',
                        {
                            active: false,
                            pageURL: '',
                            pageCount: 0,
                            pageNumber: 0
                        },
                        {},
                        ['Incorrect username or password.']
                    ));
                }
            });
        });

    router.get('/change', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        if (!req.session.user) {
            res.status(401).render("create-edit", getArguments(
                req.session.user,
                req.session.config,
                'Change Password',
                -1,
                'Access Denied',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['You are not logged in.']
            ));
        } else {
            res.status(200).render('pass-change', getArguments(
                req.session.user,
                req.session.config,
                'Change Password',
                102,
                '',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {
                    set: false
                },
            ));
        }
    });

    router.get('/set', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).render('pass-change', getArguments(
            req.session.user,
            req.session.config,
            'Set Password',
            102,
            '',
            '',
            {
                active: false,
                pageURL: '',
                pageCount: 0,
                pageNumber: 0
            },
            {
                set: true,
                username: req.query.username
            },
        ));
    });

    return router;
}