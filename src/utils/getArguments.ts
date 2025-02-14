import { getCssVars } from "@da/color";
import { PersonalConfig, User } from "@da/user";

export default function getArguments(
    user: User, config: PersonalConfig,
    title: string, webPage: number, legend: string,
    search: string, pages: Pages, args: object,
    errors?: string[], successes?: string[], messages?: string[]
): object {
    return new Arguments(user, config, title, webPage, legend, search, pages, args, errors, successes, messages);
}

export class Arguments {
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
        user: User, config: PersonalConfig,
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
        this.config = user ? user.config : config ? config : User.getDefaultConfig();
        this.themeSheet = getCssVars(new PersonalConfig(this.config));
        this.args = args;
        if (errors == undefined) {
            errors = [];
        }
        if (successes == undefined) {
            successes = [];
        }
        if (messages == undefined) {
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