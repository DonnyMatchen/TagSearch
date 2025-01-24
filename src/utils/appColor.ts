import convert from 'color-convert';

export function getRGB(params: {h: number, l: lums} | HslColor): number[] {
    if((<any>params).s) {
        return convert.hsl.rgb([params.h, (<any>params).s, params.l]);
    } else {
        return convert.hsl.rgb([params.h, 80, params.l]);
    }
}

export enum hues {
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
export enum lums {
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

export function formColor(h: number, l: lums) {
    return new HslColor(h, 80, l);
}

export const prefabs = {
    red_dark: new HslColor(hues.red, 80, lums.dark),
    red: new HslColor(hues.red, 80, lums.bright),
    red_light: new HslColor(hues.red, 80, lums.light),
    orange_dark: new HslColor(hues.orange, 80, lums.dark),
    orange: new HslColor(hues.orange, 80, lums.bright),
    orange_light: new HslColor(hues.orange, 80, lums.light),
    yellow_dark: new HslColor(hues.yellow, 80, lums.dark),
    yellow: new HslColor(hues.yellow, 80, lums.bright),
    yellow_light: new HslColor(hues.yellow, 80, lums.light),
    lime_dark: new HslColor(hues.lime, 80, lums.dark),
    lime: new HslColor(hues.lime, 80, lums.bright),
    lime_light: new HslColor(hues.lime, 80, lums.light),
    green_dark: new HslColor(hues.green, 80, lums.dark),
    green: new HslColor(hues.green, 80, lums.bright),
    green_light: new HslColor(hues.green, 80, lums.light),
    puse_dark: new HslColor(hues.puse, 80, lums.dark),
    puse: new HslColor(hues.puse, 80, lums.bright),
    puse_light: new HslColor(hues.puse, 80, lums.light),
    cyan_dark: new HslColor(hues.cyan, 80, lums.dark),
    cyan: new HslColor(hues.cyan, 80, lums.bright),
    cyan_light: new HslColor(hues.cyan, 80, lums.light),
    teal_dark: new HslColor(hues.teal, 80, lums.dark),
    teal: new HslColor(hues.teal, 80, lums.bright),
    teal_light: new HslColor(hues.teal, 80, lums.light),
    blue_dark: new HslColor(hues.blue, 80, lums.dark),
    blue: new HslColor(hues.blue, 80, lums.bright),
    blue_light: new HslColor(hues.blue, 80, lums.light),
    purple_dark: new HslColor(hues.purple, 80, lums.dark),
    purple: new HslColor(hues.purple, 80, lums.bright),
    purple_light: new HslColor(hues.purple, 80, lums.light),
    magenta_dark: new HslColor(hues.magenta, 80, lums.dark),
    magenta: new HslColor(hues.magenta, 80, lums.bright),
    magenta_light: new HslColor(hues.magenta, 80, lums.light),
    pink_dark: new HslColor(hues.pink, 80, lums.dark),
    pink: new HslColor(hues.pink, 80, lums.bright),
    pink_light: new HslColor(hues.pink, 80, lums.light),
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