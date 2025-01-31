import express, { Router } from "express";
import { body, validationResult } from 'express-validator';

import { DataHandler, PersonalConfig, User, UserState } from "@rt/data";
import getArguments from "@utl/getArguments";
import { HslColor, Lum } from "@utl/appColor";

export default function config(dataHandler: DataHandler): Router {
    const router: Router = express.Router();
    
    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let config = req.session.user ? req.session.user.config : User.getDefaultConfig();
        res.render('settings', getArgumentsSimply(req.session.user, config));
    });
    router.post('/',
        (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        if(!req.session.user) {
            res.render('settings', getArgumentsSimply(req.session.user, User.getDefaultConfig(), ['Settings could not be saved because you are not logged in.']));
        } else {
            let errorList = validationResult(req);
            let config: PersonalConfig = {
                tagLum: lumFromString(req.body.tagl),
                bg: new HslColor(`${req.body.bgA}:${req.body.bgB}:${req.body.bgC}`),
                fg: new HslColor(`${req.body.fgA}:${req.body.fgB}:${req.body.fgC}`),
                header: new HslColor(`${req.body.hdA}:${req.body.hdB}:${req.body.hdC}`),
                msg: new HslColor(`${req.body.msgA}:${req.body.msgB}:${req.body.msgC}`),
                theme: new HslColor(`${req.body.thmA}:${req.body.thmB}:${req.body.thmC}`),
                bad: new HslColor(`${req.body.bdA}:${req.body.bdB}:${req.body.bdC}`),
                good: new HslColor(`${req.body.gdA}:${req.body.gdB}:${req.body.gdC}`),
            };
            if(errorList.isEmpty()) {
                dataHandler.getUser(req.session.user.username).then(user => {
                    user.config = config;
                    req.session.user = user;
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
    let form: object = new ConfigHolder(
        'select',
        'hl-color',
        'hl-color',
        'hl-color',
        'hl-color',
        'hl-color',
        'hl-color',
        'hl-color'
    );
    let labels: object = new ConfigHolder(
        'Tag Luminance',
        'Background Color',
        'Text Color',
        'Header Color',
        'Message Color',
        'Theme Color',
        'Delete/Error Color',
        'Edit/Success Color'
    );
    let arrs: object = {
        tagl: ['Dark', 'Bright', 'Light']
    };
    let vals = new ConfigHolder(
        `${getLum(config.tagLum)}`,
        `${HslColor.data(config.bg)}`,
        `${HslColor.data(config.fg)}`,
        `${HslColor.data(config.header)}`,
        `${HslColor.data(config.msg)}`,
        `${HslColor.data(config.theme)}`,
        `${HslColor.data(config.bad)}`,
        `${HslColor.data(config.good)}`
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
    tagl: string;
    bg: string;
    fg: string;
    hd: string;
    msg: string;
    thm: string;
    bd: string;
    gd: string;

    constructor(tagl: string, bg: string, fg: string, hd: string, msg: string, thm: string, bd: string, gd: string) {
        this.tagl = tagl;
        this.bg = bg;
        this.fg = fg;
        this.hd = hd;
        this.msg = msg;
        this.thm = thm;
        this.bd = bd;
        this.gd = gd;
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