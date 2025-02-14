import express, { Router } from "express";

import { Lum } from "@da/color";
import { PersonalConfig, User } from "@da/user";
import DataHandler from "@dh/dataHandler";
import getArguments from "@utl/getArguments";

export default function config(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let config = req.session.user ? req.session.user.config : req.session.config ? req.session.config : User.getDefaultConfig();
        res.render('settings', getArgumentsSimply(req.session.user, new PersonalConfig(config)));
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
        `${config.bg.data()}`,
        `${config.fg.data()}`,
        `${config.header.data()}`,
        `${config.msg.data()}`,
        `${config.theme.data()}`,
        `${config.bad.data()}`,
        `${config.good.data()}`
    );
    return getArguments(
        user,
        config,
        `Settings`,
        103,
        'Color settings will update temporarily when you click away, but must be saved to be permanent',
        '',
        {
            active: false,
            pageURL: '',
            pageCount: 0,
            pageNumber: 0
        },
        {
            target: `/api/color`,
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
    switch (lum) {
        case Lum.dark: return 'Dark';
        case Lum.bright: return 'Bright';
        case Lum.light: return 'Light';
    }
}