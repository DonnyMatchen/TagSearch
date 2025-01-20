import { User } from "@rt/data";

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