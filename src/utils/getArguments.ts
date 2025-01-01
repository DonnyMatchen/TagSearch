import { User } from "@rt/data";
import { Session } from "express-session";

export default function getArguments(
    user: User,
     title: string, page: number, legend: string,
     search: string, styles: string[], args: object,
     errors?: string[], successes?: string[], messages?: string[]
): object {
    return new Arguments(user, title, page, legend, search, styles, args, errors, successes, messages);
}

export class Arguments {
    static url: string;
    baseURL: string = Arguments.url;
    title: string;
    page: number;
    legend: string;
    search: string;
    styles: string[];
    errors: string[];
    successes: string[];
    messages: string[];
    args: object = {};
    user: User;

    constructor(
         user: User,
         title: string, page: number, legend: string,
         search: string, styles: string[], args: object,
         errors?: string[], successes?: string[], messages?: string[]
    ) {
        this.user = user;
        this.title = title;
        this.page = page;
        this.legend = legend;
        this.search = search;
        this.styles = styles;
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