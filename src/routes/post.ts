import express, { Router } from "express";

import { colorNames } from "@da/color";
import { Role, roleToString } from '@da/user';
import { PersonalConfig, User } from "@da/user";
import DataHandler from "@dh/dataHandler";
import getArguments from "@utl/getArguments";

export default function post(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function (req, res) {
        res.redirect("/post/item");
    });

    router.get("/item", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if (req.session.user == undefined || req.session.user.role < 1) {
            res.status(401).render("create-edit", getArguments(
                req.session.user,
                req.session.config,
                'New Item',
                -1,
                'Access Denied',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ["You are not permitted to create or edit items."]
            ));
        } else {
            if (req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'item', false
                ).then(args => res.status(200).render("create-edit", args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'item', true
                ).then(args => res.status(200).render("create-edit", args));
            }
        }
    });

    router.get('/tag', function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if (req.session.user == undefined || req.session.user.role < 1) {
            res.status(401).render('create-edit', getArguments(
                req.session.user,
                req.session.config,
                'New Tag',
                -1,
                'Access Denied',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['You are not permitted to create or edit tags.']
            ));
        } else {
            if (req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'tag', false
                ).then(args => res.status(200).render("create-edit", args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'tag', true
                ).then(args => res.status(200).render("create-edit", args));
            }
        }
    });

    router.get("/tagType", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if (req.session.user == undefined || req.session.user.role == 0) {
            res.status(401).render('create-edit', getArguments(
                req.session.user,
                req.session.config,
                'New Tag',
                -1,
                'Access Denied',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['You are not permitted to create or edit tag types.']
            ));
        } else {
            if (req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'tagType', false
                ).then(args => res.status(200).render('create-edit', args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'tagType', true
                ).then(args => res.status(200).render('create-edit', args));
            }
        }
    });

    router.get("/user", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if (req.session.user == undefined || req.session.user.role < Role.Admin) {
            res.status(401).render("create-edit", getArguments(
                req.session.user,
                req.session.config,
                'New User',
                -1,
                'Access Denied',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['You are not permitted to create or edit users.']
            ));
        } else {
            if (req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'user', false
                ).then(args => res.status(200).render('create-edit', args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.session.config, req.query, req.body, 'user', true
                ).then(args => res.status(200).render('create-edit', args));
            }
        }
    });

    return router;
}

async function getTagTypes(dataHandler: DataHandler): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        let out: string[] = [];
        dataHandler.searchTagTypes('', -1, 1).then(results => {
            for (let i = 0; i < results.results.length; i++) {
                out.push(results.results[i].name);
            }
            resolve(out);
        }, error => reject(error));
    });
}

async function getArgumentsSimply(
    dataHandler: DataHandler, user: User, config: PersonalConfig, query: any, body: any,
    dataType: string, edit: boolean,
    errors?: string[], successes?: string[], messages?: string[]
): Promise<object> {
    return new Promise<object>((resolve, reject) => {
        let typeName: string = '';
        let page: number = 0;
        let form: object = {};
        let labels: object = {};
        let arrs: object = {};
        let vals: object = {};
        let found = false;
        new Promise<void>((resolve1, reject1) => {
            switch (dataType) {
                case ('item'):
                    typeName = 'Item';
                    page = 5;
                    (<any>arrs).pub = ['Public', 'Private'];
                    form = edit ?
                        new RetItemHolder('text/dis', 'file', 'url', 'datetime', 'tags', 'text-area', 'radio') :
                        new ItemHolder('file', 'url', 'datetime', 'tags', 'text-area', 'radio')
                    labels = edit ?
                        new RetItemHolder('Unique ID*', 'Upload', 'Source URL', 'Date and Time*', 'Tags', 'Description', 'Visibility') :
                        new ItemHolder('Upload', 'Source URL', 'Date and Time*', 'Tags', 'Description', 'Visibility')
                    if (edit) {
                        dataHandler.getItem(+query.edit).then(item => {
                            vals = new RetItemHolder(`${item.id}`, '', item.source, `${new Date(item.date).toISOString().slice(0, 19)}`, item.tags.join(' '), item.desc, item.pub ? 'Public' : 'Private');
                            found = true;
                            resolve1();
                        }, (error: Error) => {
                            if (!errors) {
                                errors = [];
                            }
                            errors.push(`Invalid item id: ${query.edit}`);
                            resolve1();
                        });
                    } else {
                        resolve1();
                    }
                    break;
                case ('tag'):
                    typeName = 'Tag';
                    page = 6;
                    form = new TagHolder(`text${edit ? '/dis' : ''}`, 'select', 'tag');
                    labels = new TagHolder('Name*', 'Type*', 'Parent');
                    getTagTypes(dataHandler).then(types => {
                        (<any>arrs).type = types;
                    }).then(() => {
                        if (edit) {
                            dataHandler.getTag(query.edit).then(tag => {
                                vals = new TagHolder(tag.name, tag.type, tag.parent == null ? '' : tag.parent);
                                found = true;
                                resolve1();
                            }, (error: Error) => {
                                if (errors == undefined) {
                                    errors = [];
                                }
                                errors.push(`Invalid tag name: ${query.edit}`);
                                resolve1();
                            });
                        } else {
                            resolve1();
                        }
                    });
                    break;
                case ('tagType'):
                    typeName = 'Tag Type';
                    page = 7;
                    form = new TagTypeHolder(`text${edit ? '/dis' : ''}`, 'hue', 'number');
                    labels = new TagTypeHolder('Name*', 'Color*', 'Sort Order');
                    (<any>arrs).chue = colorNames;
                    if (edit) {
                        dataHandler.getTagType(query.edit).then(type => {
                            vals = new TagTypeHolder(type.name, `${type.color.encoded}`, `${type.order}`);
                            found = true;
                            resolve1();
                        }, (error: Error) => {
                            if (errors == undefined) {
                                errors = [];
                            }
                            errors.push(`Invalid tag type name: ${query.edit}`);
                            resolve1();
                        });
                    } else {
                        resolve1();
                    }
                    break;
                case ('user'):
                    typeName = 'User';
                    page = 8;
                    form = new UserHolder(`text${edit ? '/dis' : ''}`, 'text', 'select');
                    labels = new UserHolder('Username*', 'Password*', 'User Role*');
                    arrs = { role: ['Normal', 'Family', 'Admin'] };
                    if (edit) {
                        dataHandler.getUser(query.edit).then(user => {
                            vals = new UserHolder(user.username, '', roleToString(user.role));
                            found = true;
                            resolve1();
                        }, (error: Error) => {
                            if (errors == undefined) {
                                errors = [];
                            }
                            errors.push(`Invalid username: ${query.edit}`);
                            resolve1();
                        });
                    } else {
                        resolve1();
                    }
                    break;
                default:
                    reject(new Error(`Data type "${dataType}" not recognized.`));
            }
        }).then(() => {
            resolve(getArguments(
                user,
                config,
                `${edit && found ? 'Edit' : 'New'} ${typeName}`,
                edit && found ? -1 : page,
                'Required fields are marked by a *',
                '',
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                edit && found ? {
                    target: `/api/data/${dataType}`,
                    form: form,
                    labels: labels,
                    arrs: arrs,
                    vals: vals,
                    update: edit && found
                } : {
                    target: `/api/data/${dataType}`,
                    form: form,
                    labels: labels,
                    arrs: arrs,
                    update: false
                },
                errors,
                successes,
                messages
            ));
        });
    });
}

class ItemHolder {
    file: string;
    src: string;
    date: string;
    tags: string;
    desc: string;
    pub: string;

    constructor(file: string, src: string, date: string, tags: string, desc: string, pub: string) {
        this.file = file;
        this.src = src;
        this.date = date;
        this.tags = tags;
        this.desc = desc;
        this.pub = pub;
    }
}
class RetItemHolder {
    id: string;
    file: string;
    src: string;
    date: string;
    tags: string;
    desc: string;
    pub: string;

    constructor(id: string, file: string, src: string, date: string, tags: string, desc: string, pub: string) {
        this.id = id;
        this.file = file;
        this.src = src;
        this.date = date;
        this.tags = tags;
        this.desc = desc;
        this.pub = pub;
    }
}
class TagHolder {
    name: string;
    type: string;
    prnt: string;

    constructor(name: string, type: string, prnt: string) {
        this.name = name;
        this.type = type;
        this.prnt = prnt;
    }
}
class TagTypeHolder {
    name: string;
    chue: string;
    ordr: string;

    constructor(name: string, chue: string, ordr: string) {
        this.name = name;
        this.chue = chue;
        this.ordr = ordr;
    }
}
class UserHolder {
    name: string;
    pass: string;
    role: string;

    constructor(name: string, pass: string, role: string) {
        this.name = name;
        this.pass = pass;
        this.role = role;
    }
}