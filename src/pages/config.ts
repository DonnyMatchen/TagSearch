import express, { Router } from "express";
import { body, validationResult } from 'express-validator';

import { DataHandler, PersonalConfig, User, UserState } from "@rt/data";
import getArguments from "@utl/getArguments";
import { Lum } from "@utl/appColor";

export default function config(dataHandler: DataHandler): Router {
    const router: Router = express.Router();
    
    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let config = req.session.user ? req.session.user.config : User.getDefaultConfig();
        res.render('settings', getArgumentsSimply(req.session.user, config));
    });
    router.post('/',
        body('them')
            .notEmpty().withMessage('empty'),
        body('bad')
            .notEmpty().withMessage('empty'),
        body('good')
            .notEmpty().withMessage('empty'),
        (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        if(!req.session.user) {
            res.render('settings', getArgumentsSimply(req.session.user, User.getDefaultConfig(), ['Settings could not be saved because you are not logged in.']));
        } else {
            let errorList = validationResult(req);
            let config: PersonalConfig = {
                dark: req.body.dark == 'On',
                tagLum: lumFromString(req.body.tagl),
                theme: +req.body.them,
                themeLum: lumFromString(req.body.thml),
                bad: +req.body.bad,
                good: +req.body.good
            };
            if(errorList.isEmpty()) {
                dataHandler.getUser(req.session.user.username).then(user => {
                    user.config = config;
                    req.session.user.config = config;
                    return dataHandler.updateUser(user);
                }).then(() => {
                    res.render('settings', getArgumentsSimply(req.session.user, config, [], ['Settings updated successfully.']));
                }, (error: Error) => {
                    res.render('settings', getArgumentsSimply(req.session.user, config, ['Failed to update settings.', error.message]));
                });
            } else {
                let errors: string[] = [];
                errorList['errors'].forEach((error: any) => {
                    if(error.path == 'them') {
                        if(error.msg == 'empty') {
                            errors.push('Theme Color is blank');
                        }
                    } else if(error.path == 'bad') {
                        if(error.msg == 'empty') {
                            errors.push('Delete/Error Color is blank');
                        }
                    } else if(error.path == 'good') {
                        if(error.msg == 'empty') {
                            errors.push('Edit/Success Color is blank');
                        }
                    }
                });
                res.render('settings', getArgumentsSimply(req.session.user, config, errors));
            }
        }
    });

    return router;
}

function getArgumentsSimply(user: User, config: PersonalConfig, errors?: string[], successes?: string[], messages?: string[]): object {
    let form: object = new ConfigHolder('on/off', 'select', 'hue', 'select', 'hue', 'hue');
    let labels: object = new ConfigHolder('Dark Mode', 'Tag Luminance', 'Theme Color', 'Theme Luminance', 'Delete/Error Color', 'Edit/Success Color');
    let arrs: object = {
        tagl: ['Dark', 'Bright', 'Light'],
        thml: ['Dark', 'Bright', 'Light']
    };
    let vals = new ConfigHolder(
        config.dark ? 'On' : 'Off',
        `${getLum(config.tagLum)}`,
        `${config.theme}`,
        `${getLum(config.themeLum)}`,
        `${config.bad}`,
        `${config.good}`
    );
    return getArguments(
        user,
        `Settings`,
        103,
        'Settings will display immediately, but must be saved to be permanent.',
        '',
        {
            active: false,
            pageURL: '',
            pageCount: 0,
            pageNumber: 0
        },
        {
            target: `/config`,
            form: form,
            labels: labels,
            arrs: arrs,
            vals: vals,
            update: true
        },
        errors,
        successes,
        messages
    );
}

class ConfigHolder {
    dark: string;
    tagl: string;
    them: string;
    thml: string;
    bad: string;
    good: string;

    constructor(dark: string, tagl: string, them: string, thml: string, bad: string, good: string) {
        this.dark = dark;
        this.tagl = tagl;
        this.them = them;
        this.thml = thml;
        this.bad = bad;
        this.good = good;
    }
}

function getLum(lum: Lum): string {
    switch(lum) {
        case Lum.dark: return 'Dark';
        case Lum.bright: return 'Bright';
        case Lum.light: return 'Light';
    }
}
function lumFromString(str: string): Lum {
    switch(str) {
        case 'Dark': return Lum.dark;
        case 'Bright': return Lum.bright;
        case 'Light': return Lum.light;
    }
}