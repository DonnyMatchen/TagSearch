import convert from 'color-convert';

import { PersonalConfig } from '@da/user';

export function getRGB(params: HslColor): number[] {
    return convert.hsl.rgb([params.h, (<any>params).s, params.l]);
}

export enum Hue {
    red = 0,
    orange = 30,
    yellow = 60,
    lime = 90,
    green = 120,
    chartreuse = 150,
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

export class HslColor {
    h: number;
    s: number;
    l: number;

    constructor(obj: { h: number, s: number, l: number });
    constructor(str: string);
    constructor(h: number, s: number, l: number);

    constructor(hOrStrOrObj: any, s?: number, l?: number) {
        if (s != undefined && l != undefined) {
            this.h = hOrStrOrObj;
            this.s = s;
            this.l = l;
        } else if (typeof hOrStrOrObj == 'string') {
            let parts = (<string>hOrStrOrObj).split(':');
            if (parts[0] == 'Color') {
                this.h = +parts[1];
                this.s = 80;
                this.l = +parts[2];
            } else {
                this.h = 0;
                this.s = 0;
                this.l = +parts[2];
            }
        } else {
            this.h = hOrStrOrObj.h;
            this.s = hOrStrOrObj.s;
            this.l = hOrStrOrObj.l;
        }
    }

    getHover(): HslColor {
        if (this.l > 5) {
            return new HslColor(this.h, this.s, this.l * 3 / 4);
        } else {
            return new HslColor(this.h, this.s, this.l * 5 / 4);
        }
    }
    toString(): string {
        return `${this.h}, ${this.s}%, ${this.l}%`;
    }
    data(): string {
        if (this.s == 0) {
            return `Grayscale::${this.l}`;
        } else {
            return `Color:${this.h}:${this.l}`
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
            switch (lum) {
                case Lum.dark: return new HslColor(0, 0, +parts[1] < 50 ? +parts[1] : 100 - +parts[1]);
                case Lum.light:
                case Lum.bright: return new HslColor(0, 0, +parts[1] > 50 ? +parts[1] : 100 - +parts[1]);
            }
        }
    }
}

export function formColor(h: number, l: Lum) {
    return new HslColor(h, 80, l);
}

export const colorNames: string[] = [
    "red",
    "orange",
    "yellow",
    "lime",
    "green",
    "chartreuse",
    "cyan",
    "teal",
    "blue",
    "purple",
    "magenta",
    "pink"
];

export function getCssVars(config: PersonalConfig): string {
    let msgH = config.msg.getHover();
    let themeH = config.theme.getHover();
    let badH = config.bad.getHover();
    let goodH = config.good.getHover();
    let header = getRGB(config.header);
    let link = getRGB(config.fg);
    let linkH = getRGB(config.fg.getHover());
    return `:root {--bacground: ${config.bg.toString()
        };--foreground: ${config.fg.toString()
        };--content: ${config.theme.toString()
        };--content-h: ${themeH.toString()
        };--error: ${config.bad.toString()
        };--error-h: ${badH.toString()
        };--success: ${config.good.toString()
        };--success-h: ${goodH.toString()
        };--message: ${config.msg.toString()
        };--message-h: ${msgH.toString()
        };--header: ${header[0]}, ${header[1]}, ${header[2]
        };--link: ${link[0]}, ${link[1]}, ${link[2]
        };--link-h: ${linkH[0]}, ${linkH[1]}, ${linkH[2]
        };}`;
}

export function lumFromString(str: string): Lum {
    switch (str) {
        case 'Dark': return Lum.dark;
        case 'Bright': return Lum.bright;
        case 'Light': return Lum.light;
    }
}