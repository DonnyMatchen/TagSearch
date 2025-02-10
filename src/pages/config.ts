import express, { Router } from "express";

import { DataHandler, PersonalConfig, User } from "@rt/data";
import { HslColor, Lum } from "@utl/appColor";
import getArguments from "@utl/getArguments";

export default function config(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let config = req.session.user ? req.session.user.config : User.getDefaultConfig();
        res.render('create-edit', getArgumentsSimply(req.session.user, config));
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
        config,
        `Settings`,
        103,
        'Color settings can be saved without an account.',
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