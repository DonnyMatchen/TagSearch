import { PersonalConfig } from '@rt/data';
import convert from 'color-convert';

export function getRGB(params: {h: number, l: Lum} | HslColor): number[] {
    if(params instanceof HslColor) {
        return convert.hsl.rgb([params.h, (<any>params).s, params.l]);
    } else {
        return convert.hsl.rgb([params.h, 80, params.l]);
    }
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
    h: number;
    s: number;
    l: number;

    constructor(h: number, s: number, l: number) {
        this.h = h;
        this.s = s;
        this.l = l;
    }

    getHover(): HslColor {
        if(this.l > 5) {
            return new HslColor(this.h, this.s, this.l * 3/4);
        } else {
            return new HslColor(this.h, this.s, this.l * 5/4);
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
    let theme = new HslColor(config.theme, 80, config.themeLum);
    let themeH = theme.getHover();
    let bad = new HslColor(config.bad, 80, config.themeLum);
    let badH = bad.getHover();
    let good = new HslColor(config.good, 80, config.themeLum);
    let goodH = good.getHover();
    let header = getRGB(new HslColor(0, 0, config.dark ? 10 : 90));
    let foreground = new HslColor(0, 0, config.dark ? 90 : 10);
    let link = getRGB(foreground);
    let linkH = getRGB(foreground.getHover());
    return `:root {--bacground: 0, 0%, ${config.dark ? 20 : 80}%;--foreground: 0, 0%, ${config.dark ? 90 : 10}%;--content: ${theme.h}, 80%, ${theme.l}%;--content-h: ${themeH.h}, 80%, ${themeH.l}%;--error: ${bad.h}, 80%, ${bad.l}%;--error-h: ${badH.h}, 80%, ${badH.l}%;--success: ${good.h}, 80%, ${good.l}%;--success-h: ${goodH.h}, 80%, ${goodH.l}%;--message: 0, 0%, ${config.dark ? 30 : 70}%;--message-h: 0, 0%, ${config.dark ? 22.5 : 77.5}%;--header: ${header[0]}, ${header[1]}, ${header[2]};--link: ${link[0]}, ${link[1]}, ${link[2]};--link-h: ${linkH[0]}, ${linkH[1]}, ${linkH[2]};}`;
}