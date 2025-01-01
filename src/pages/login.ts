import express, { Router } from "express";
import { body, validationResult } from 'express-validator';

import { DataHandler, User, UserState } from "@rt/data";
import getArguments from "@utl/getArguments";

export default function login(dataHandler: DataHandler): Router {
    const router: Router = express.Router();
    
    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.render('login', getArguments(
            req.session.user,
            'Sign In',
            101,
            req.session.user == undefined ? '': 'You are already logged in',
            '',
            ['form', 'login'],
            {}
        ));
    });
    router.post('/',
            body('uname')
                .notEmpty().withMessage('empty'),
            body('pass')
                .notEmpty().withMessage('empty'),
            async (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let errorList = validationResult(req);
        let failure: boolean = false;
        if(errorList.isEmpty()) {
            await dataHandler.getUser(req.body.uname).then(async user => {
                if(user.state == UserState.Set) {
                    await user.check(req.body.pass).then(check => {
                        if(check) {
                            req.session.user = user;
                            res.redirect('/search');
                        } else {
                            failure = true;
                        }
                    }, (error:Error) => {
                        failure = true;
                    });
                } else {
                    res.redirect(`/login/set?username=${user.username}`);
                }
            }, (error:Error) => {
                failure = true;
            });
        } else {
            failure = true;
        }
        
        if(failure) {
            res.render('login', getArguments(
                req.session.user,
                'Sign In',
                101,
                req.session.user == undefined ? '': 'You are already logged in',
                '',
                ['form', 'login'],
                {},
                ['Incorrect username or password.']
            ));
        }
    });

    router.get('/change', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.render('pass-change', getArguments(
            req.session.user,
            'Change Password',
            102,
            '',
            '',
            ['form', 'login'],
            {
                set: false
            },
        ));
    });
    router.post('/change',
            body('oPass')
        .notEmpty().withMessage('empty'),
            body('nPass1')
        .notEmpty().withMessage('empty')
        .isLength({min: 16}).withMessage('short'),
            body('nPass2')
        .notEmpty().withMessage('empty')
        .isLength({min: 16}).withMessage('short'),
    (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let errorList = validationResult(req);
        let errors: string[] = [];
        let oldPass: string = req.body.oPass;
        let newPass1: string = req.body.nPass1;
        let newPass2: string = req.body.nPass2;
        if(newPass1 != newPass2) {
            errors.push('Passwords do nto match.');
        }
        dataHandler.getUser(req.session.user.username).then(async user => {
            if(errorList.isEmpty() && errors.length == 0) {
                await user.setPassword(oldPass, newPass1).then(async () => {
                    await dataHandler.updateUser(user).then(() => {
                        res.render('pass-change', getArguments(
                            req.session.user,
                            'Change Password',
                            102,
                            '',
                            '',
                            ['form', 'login'],
                            {
                                set: false
                            },
                            [], ['Password chagned successfully!']
                        ));
                    }, (error:Error) => {
                        errors.push(error.message);
                    });
                }, (error:Error) => {
                    errors.push(error.message);
                });
            }
        }, (error:Error) => {
            errors.push(error.message);
        }).finally(() => {
            if(!errorList.isEmpty() || errors.length > 0) {
                errorList['errors'].forEach((error: any) => {
                    if(error.path == 'oPass') {
                        if(error.msg == 'empty') {
                            errors.push('Old password is blank');
                        }
                    } else if(error.path == 'nPass1') {
                        if(error.msg == 'empty') {
                            errors.push('New password is blank');
                        } else if(error.msg == 'short') {
                            errors.push('New password is shorter than 16 characters.');
                        }
                    } else if(error.path == 'nPass2') {
                        if(error.msg == 'empty') {
                            errors.push('New password re-entry is blank');
                        } else if(error.msg == 'short') {
                            errors.push('New password re-entry is shorter than 16 characters.');
                        }
                    }
                });
                res.render('pass-change', getArguments(
                    req.session.user,
                    'Change Password',
                    102,
                    '',
                    '',
                    ['form', 'login'],
                    {
                        set: false
                    },
                    errors
                ));
            }
        });;
    });

    router.get('/set', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.render('pass-change', getArguments(
            req.session.user,
            'Set Password',
            102,
            '',
            '',
            ['form', 'login'],
            {
                set: true,
                user: req.query.username
            },
        ));
    });
    router.post('/set',
        body('uname')
    .notEmpty().withMessage('empty'),
        body('pass1')
    .notEmpty().withMessage('empty')
    .isLength({min: 16}).withMessage('short'),
        body('pass2')
    .notEmpty().withMessage('empty')
    .isLength({min: 16}).withMessage('short'),
    (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let errorList = validationResult(req);
        let errors: string[] = [];
        let username: string = req.body.uname;
        let newPass1: string = req.body.Pass1;
        let newPass2: string = req.body.Pass2;
        if(newPass1 != newPass2) {
            errors.push('Passwords do nto match.');
        }
        dataHandler.getUser(username).then(async user => {
            if(errorList.isEmpty() && errors.length == 0) {
                await user.setPassword('', newPass1).then(async () => {
                    await dataHandler.updateUser(user).then(() => {
                        res.render('pass-change', getArguments(
                            req.session.user,
                            'Set Password',
                            102,
                            '',
                            '',
                            ['form', 'login'],
                            {
                                set: true
                            },
                            [], ['Password chagned successfully!']
                        ));
                    }, (error:Error) => {
                        errors.push(error.message);
                    });
                }, (error:Error) => {
                    errors.push(error.message);
                });
            }
        }, (error:Error) => {
            errors.push(error.message);
        }).finally(() => {
            if(!errorList.isEmpty() || errors.length > 0) {
                errorList['errors'].forEach((error: any) => {
                    if(error.path == 'oPass') {
                        if(error.msg == 'empty') {
                            errors.push('Old password is blank');
                        }
                    } else if(error.path == 'nPass1') {
                        if(error.msg == 'empty') {
                            errors.push('New password is blank');
                        } else if(error.msg == 'short') {
                            errors.push('New password is shorter than 16 characters.');
                        }
                    } else if(error.path == 'nPass2') {
                        if(error.msg == 'empty') {
                            errors.push('New password re-entry is blank');
                        } else if(error.msg == 'short') {
                            errors.push('New password re-entry is shorter than 16 characters.');
                        }
                    }
                });
                res.render('pass-change', getArguments(
                    req.session.user,
                    'Set Password',
                    102,
                    '',
                    '',
                    ['form', 'login'],
                    {
                        set: true
                    },
                    errors
                ));
            }
        });;
    });

    return router;
}