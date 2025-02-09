import convert from 'color-convert';

import { PersonalConfig } from '@rt/data';

export function getRGB(params: HslColor): number[] {
    return convert.hsl.rgb([params.h, (<any>params).s, params.l]);
}

export enum Hue {
    red = 0,
    orange = 30,
    yellow = 60,
    lime = 90,
    green = 120,
    puse = 150,
    cyan = 180,
    teal = 210,
    blue = 240,
    purple = 270,
    magenta = 300,
    pink = 330
}
export enum Lum {
    dark = 25,
    bright = 50,
    light = 75
}

export class HslColor{
    static getHover(color: HslColor): HslColor {
        if(color.l > 5) {
            return new HslColor(color.h, color.s, color.l * 3/4);
        } else {
            return new HslColor(color.h, color.s, color.l * 5/4);
        }
    }
    static toString(color: HslColor): string {
        return `${color.h}, ${color.s}%, ${color.l}%`;
    }
    static data(color: HslColor): string {
        if(color.s == 0) {
            return `Grayscale::${color.l}`;
        } else {
            return `Color:${color.h}:${color.l}`
        }
    }

    h: number;
    s: number;
    l: number;

    constructor(str: string);
    constructor(h: number, s: number, l: number);

    constructor(hOrStr: any, s?: number, l?: number) {
        if(s != undefined && l != undefined) {
            this.h = hOrStr;
            this.s = s;
            this.l = l;
        } else {
            let parts = (<string>hOrStr).split(':');
            if(parts[0] == 'Color') {
                this.h = +parts[1];
                this.s = 80;
                this.l = +parts[2];
            } else {
                this.h = 0;
                this.s = 0;
                this.l = +parts[2];
            }
        }
    }
}

export class ColorConv {
    encoded: string;

    constructor(encoded: string) {
        this.encoded = encoded;
    }

    getHSL(lum: Lum): HslColor {
        let parts = this.encoded.split(':');
        if (parts[0] == 'Color') {
            return new HslColor(+parts[1], 80, lum);
        } else {
            switch(lum) {
                case Lum.dark: return new HslColor(0,0,+parts[1] < 50 ? +parts[1] : 100-+parts[1]);
                case Lum.light:
                case Lum.bright: return new HslColor(0,0,+parts[1] > 50 ? +parts[1] : 100-+parts[1]);
            }
        }
    }
}

export function formColor(h: number, l: Lum) {
    return new HslColor(h, 80, l);
}

export const prefabs = {
    red_dark: new HslColor(Hue.red, 80, Lum.dark),
    red: new HslColor(Hue.red, 80, Lum.bright),
    red_light: new HslColor(Hue.red, 80, Lum.light),
    orange_dark: new HslColor(Hue.orange, 80, Lum.dark),
    orange: new HslColor(Hue.orange, 80, Lum.bright),
    orange_light: new HslColor(Hue.orange, 80, Lum.light),
    yellow_dark: new HslColor(Hue.yellow, 80, Lum.dark),
    yellow: new HslColor(Hue.yellow, 80, Lum.bright),
    yellow_light: new HslColor(Hue.yellow, 80, Lum.light),
    lime_dark: new HslColor(Hue.lime, 80, Lum.dark),
    lime: new HslColor(Hue.lime, 80, Lum.bright),
    lime_light: new HslColor(Hue.lime, 80, Lum.light),
    green_dark: new HslColor(Hue.green, 80, Lum.dark),
    green: new HslColor(Hue.green, 80, Lum.bright),
    green_light: new HslColor(Hue.green, 80, Lum.light),
    puse_dark: new HslColor(Hue.puse, 80, Lum.dark),
    puse: new HslColor(Hue.puse, 80, Lum.bright),
    puse_light: new HslColor(Hue.puse, 80, Lum.light),
    cyan_dark: new HslColor(Hue.cyan, 80, Lum.dark),
    cyan: new HslColor(Hue.cyan, 80, Lum.bright),
    cyan_light: new HslColor(Hue.cyan, 80, Lum.light),
    teal_dark: new HslColor(Hue.teal, 80, Lum.dark),
    teal: new HslColor(Hue.teal, 80, Lum.bright),
    teal_light: new HslColor(Hue.teal, 80, Lum.light),
    blue_dark: new HslColor(Hue.blue, 80, Lum.dark),
    blue: new HslColor(Hue.blue, 80, Lum.bright),
    blue_light: new HslColor(Hue.blue, 80, Lum.light),
    purple_dark: new HslColor(Hue.purple, 80, Lum.dark),
    purple: new HslColor(Hue.purple, 80, Lum.bright),
    purple_light: new HslColor(Hue.purple, 80, Lum.light),
    magenta_dark: new HslColor(Hue.magenta, 80, Lum.dark),
    magenta: new HslColor(Hue.magenta, 80, Lum.bright),
    magenta_light: new HslColor(Hue.magenta, 80, Lum.light),
    pink_dark: new HslColor(Hue.pink, 80, Lum.dark),
    pink: new HslColor(Hue.pink, 80, Lum.bright),
    pink_light: new HslColor(Hue.pink, 80, Lum.light),
    black: new HslColor(0, 0, 0),
    grey_1: new HslColor(0, 0, 10),
    grey_2: new HslColor(0, 0, 20),
    grey_3: new HslColor(0, 0, 30),
    grey_4: new HslColor(0, 0, 40),
    grey_5: new HslColor(0, 0, 50),
    grey_6: new HslColor(0, 0, 60),
    grey_7: new HslColor(0, 0, 70),
    grey_8: new HslColor(0, 0, 80),
    grey_9: new HslColor(0, 0, 90),
    white: new HslColor(0, 0, 100),
}

export const colorNames: string[] = [
    "red",
    "orange",
    "yellow",
    "lime",
    "green",
    "puse",
    "cyan",
    "teal",
    "blue",
    "purple",
    "magenta",
    "pink"
];

export const colorCodex: Map<string, number> = new Map();

export function prep() {
    colorCodex.clear();    colorCodex.set('red', 0);
    colorCodex.set('orange', 30);
    colorCodex.set('yellow', 60);
    colorCodex.set('lime', 90);
    colorCodex.set('green', 120);
    colorCodex.set('puse', 150);
    colorCodex.set('cyan', 180);
    colorCodex.set('teal', 210);
    colorCodex.set('blue', 240);
    colorCodex.set('purple', 270);
    colorCodex.set('magenta', 300);
    colorCodex.set('pink', 330);
}

export function getCssVars(config: PersonalConfig): string {
    let msgH = HslColor.getHover(config.msg);
    let themeH = HslColor.getHover(config.theme);
    let badH = HslColor.getHover(config.bad);
    let goodH = HslColor.getHover(config.good);
    let header = getRGB(config.header);
    let link = getRGB(config.fg);
    let linkH = getRGB(HslColor.getHover(config.fg));
    return `:root {--bacground: ${
        HslColor.toString(config.bg)
    };--foreground: ${
        HslColor.toString(config.fg)
    };--content: ${
        HslColor.toString(config.theme)
    };--content-h: ${
        HslColor.toString(themeH)
    };--error: ${
        HslColor.toString(config.bad)
    };--error-h: ${
        HslColor.toString(badH)
    };--success: ${
        HslColor.toString(config.good)
    };--success-h: ${
        HslColor.toString(goodH)
    };--message: ${
        HslColor.toString(config.msg)
    };--message-h: ${
        HslColor.toString(msgH)
    };--header: ${
        header[0]}, ${header[1]}, ${header[2]
    };--link: ${
        link[0]}, ${link[1]}, ${link[2]
    };--link-h: ${
        linkH[0]}, ${linkH[1]}, ${linkH[2]
    };}`;
}

export function lumFromString(str: string): Lum {
    switch(str) {
        case 'Dark': return Lum.dark;
        case 'Bright': return Lum.bright;
        case 'Light': return Lum.light;
    }
}