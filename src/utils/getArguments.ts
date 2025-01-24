import { PersonalConfig, User } from "@rt/data";
import { getRGB, HslColor } from "./appColor";

export default function getArguments(
    user: User,
     title: string, webPage: number, legend: string,
     search: string, pages: Pages, args: object,
     errors?: string[], successes?: string[], messages?: string[]
): object {
    return new Arguments(user, title, webPage, legend, search, pages, args, errors, successes, messages);
}

export class Arguments {
    static url: string;
    baseURL: string = Arguments.url;
    title: string;
    webPage: number;
    legend: string;
    search: string;
    errors: string[];
    successes: string[];
    messages: string[];
    args: object = {};
    user: User;
    pages: Pages;
    themeSheet: string;
    config: PersonalConfig;

    constructor(
         user: User,
         title: string, webPage: number, legend: string,
         search: string, pages: Pages, args: object,
         errors?: string[], successes?: string[], messages?: string[]
    ) {
        this.user = user;
        this.title = title;
        this.webPage = webPage;
        this.legend = legend;
        this.search = search;
        this.pages = pages;
        this.config = (user) ? user.config : User.getDefaultConfig();
        let theme = new HslColor(this.config.theme, 80, this.config.themeLum);
        let themeH = theme.getHover();
        let bad = new HslColor(this.config.bad, 80, this.config.themeLum);
        let badH = bad.getHover();
        let good = new HslColor(this.config.good, 80, this.config.themeLum);
        let goodH = good.getHover();
        let header = getRGB(new HslColor(0, 0, 10));
        let foreground = new HslColor(0, 0, this.config.dark ? 90 : 10);
        let link = getRGB(foreground);
        let linkH = getRGB(foreground.getHover());
        this.themeSheet = `:root {--bacground: 0, 0%, ${this.config.dark ? 20 : 80}%;--foreground: 0, 0%, ${this.config.dark ? 90 : 10}%;--content: ${theme.h}, 80%, ${theme.l}%;--content-h: ${themeH.h}, 80%, ${themeH.l}%;--error: ${bad.h}, 80%, ${bad.l}%;--error-h: ${badH.h}, 80%, ${badH.l}%;--success: ${good.h}, 80%, ${good.l}%;--success-h: ${goodH.h}, 80%, ${goodH.l}%;--message: 0, 0%, ${this.config.dark ? 30 : 70}%;--message-h: 0, 0%, ${this.config.dark ? 22.5 : 77.5}%;--header: ${header[0]}, ${header[1]}, ${header[2]};--link: ${link[0]}, ${link[1]}, ${link[2]};--link-h: ${linkH[0]}, ${linkH[1]}, ${linkH[2]};}`;
        this.args = args;
        if(errors == undefined) {
            errors = [];
        }
        if(successes == undefined) {
            successes = [];
        }
        if(messages == undefined) {
            messages = [];
        }
        this.errors = errors;
        this.successes = successes;
        this.messages = messages;
    }
}

export class Pages {
    active: boolean;
    pageURL: string;
    pageCount: number;
    pageNumber: number;
}