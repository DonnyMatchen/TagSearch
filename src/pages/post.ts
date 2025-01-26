import express, { Router } from "express";
import { body, validationResult } from 'express-validator';

import { DataHandler, Item, ItemType, Role, Tag, TagType, User, roleToString } from '@rt/data';
import getArguments from "@utl/getArguments";
import { colorNames } from "@utl/appColor";

export default function post(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function(req, res){
        res.redirect("/post/item");
    });

    router.get("/item", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render("create-edit", getArguments(
                req.session.user,
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
            if(req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'item', false, false
                ).then(args => res.render("create-edit", args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'item', true, false
                ).then( args => res.render("create-edit", args));
            }
        }
    });
    router.post("/item",
        body('date')
            .notEmpty().withMessage('empty'),
        async function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role == 0) {
            res.render("create-edit", getArguments(
                req.session.user,
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
            let errorList = validationResult(req);
            let errors: string[] = [];
            if(req.files == null && req.body.source == '') {
                errors.push('You must either upload a file or provide a URL');
            }
            if(errorList.isEmpty() && errors.length == 0) {
                let newID: number;
                let item: Item;
                let word: string;
                new Promise<number>((resolve, reject) => {
                    if (req.body.state == 'new') {
                        word = 'created';
                        resolve(dataHandler.nextItemID());
                    } else {
                        word = 'updated';
                        resolve(+req.body.id);
                    }
                }).then(id => {
                    newID = id;
                    if(req.files == null) {
                        return <string>req.body.src;
                    } else {
                        return dataHandler.reHost((<any>req.files['file']).tempFilePath, (<any>req.files['file']).mimetype);
                    }
                }).then(src => {
                    item = new Item(dataHandler,
                        newID,
                        src,
                        new Date(req.body.date).valueOf(),
                        ItemType.Image,
                        {
                            desc: req.body.desc,
                            pub: req.body.pub == 'Public'
                        }
                    );
                    if (req.body.state == 'new') {
                        return item.tagsChanged(dataHandler, dataHandler.tagsFromString(req.body.tags));
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(() => {
                    if(errors.length == 0) {
                        if (req.body.state == 'new') {
                            console.log(`[server]: add`);
                            return dataHandler.addItem(item);
                        } else {
                            console.log(`[server]: update`);
                            return dataHandler.updateItem(item, dataHandler.tagsFromString(req.body.tags));
                        }
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(() => {
                    if(errors.length == 0) {
                        return getArgumentsSimply(
                            dataHandler, req.session.user, req.query, req.body, 'item', req.body.state != 'new', false,
                            [], [`Item ${word} successfully.`]
                        )
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(args => {
                    if(args) {
                        res.render("create-edit", args);
                    }
                }).finally(() => {
                    if(!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if(error.path == 'date') {
                                if(error.msg == 'empty') {
                                    errors.push('Date is blank');
                                }
                            }
                        });
                        if(req.body.state == 'new') {
                            getArgumentsSimply(
                                dataHandler, req.session.user, req.query, req.body, 'item', false, true, errors
                            ).then(args => res.render('create-edit', args));
                        } else {
                            getArgumentsSimply(
                                dataHandler, req.session.user, req.query, req.body, 'item', true, true, errors
                            ).then(args => res.render('create-edit', args));
                        }
                    }
                });
            }
        }
    });

    router.get('/tag', function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render('create-edit', getArguments(
                req.session.user,
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
        }else {
            if(req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'tag', false, false
                ).then(args => res.render("create-edit", args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'tag', true, false
                ).then(args => res.render("create-edit", args));
            }
        }
    });
    router.post("/tag",
        body('name')
            .notEmpty().withMessage('empty'),
        function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render("create-edit", getArguments(
                req.session.user,
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
                ["You are not permitted to create or edit tags."]
            ));
        } else {
            let errorList = validationResult(req);
            let errors: string[] = [];
            dataHandler.getTagType(req.body.type).then(async type => {
                if(errorList.isEmpty()) {
                    let parent: Tag = undefined;
                    if(req.body.prnt != undefined) {
                        await dataHandler.getTag(req.body.prnt)
                        .then(found => {
                            parent = found;
                        }, (error:Error) => {
                            errors.push('Parent is an invalid tag.');
                        });
                    }
                    if(errors.length == 0) {
                        if(req.body.state == 'new') {
                            await dataHandler.addTag(new Tag(
                                req.body.name,
                                type,
                                parent
                            )).then(() => {
                                getArgumentsSimply(
                                    dataHandler, req.session.user, req.query, req.body, 'tag', false, false,
                                    [], ['Tag created successfully.']
                                ).then(args => res.render("create-edit", args));
                            }, (error:Error) => {
                                errors.push(error.message);
                            });
                        } else {
                            await dataHandler.updateTag(new Tag(
                                req.body.name,
                                type,
                                parent
                            )).then(() => {
                                getArgumentsSimply(
                                    dataHandler, req.session.user, req.query, req.body, 'tag', false, false,
                                    [], ['Tag updated successfully.']
                                ).then(args => res.render("create-edit", args));
                            }, (error:Error) => {
                                errors.push(error.message);
                            });
                        }
                    }
                }
            }, (error:Error) => {
                errors.push('Parent is an invalid tag.');
            }).finally(() => {
                if(!errorList.isEmpty() || errors.length > 0) {
                    errorList['errors'].forEach((error: any) => {
                        if(error.path == 'name') {
                            if(error.msg == 'empty') {
                                errors.push('Name is blank');
                            }
                        }
                    });
                    if(req.body.state == 'new') {
                        getArgumentsSimply(
                            dataHandler, req.session.user, req.query, req.body, 'tag', false, true, errors
                        ).then(args => res.render('create-edit', args));
                    } else {
                        getArgumentsSimply(
                            dataHandler, req.session.user, req.query, req.body, 'tag', true, true, errors
                        ).then(args => res.render('create-edit', args));
                    }
                }
            });
        }
    });

    router.get("/tagType", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role == 0) {
            res.render('create-edit', getArguments(
                req.session.user,
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
        }else {
            if(req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'tagType', false, false
                ).then(args => res.render('create-edit', args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'tagType', true, false
                ).then(args => res.render('create-edit', args));
            }
        }
    });
    router.post("/tagType",
        body('name')
            .notEmpty().withMessage('empty'),
        body('ordr')
            .notEmpty().withMessage('empty')
            .isNumeric().withMessage('notNumber'),
        async function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < Role.Admin) {
            res.render("create-edit", getArguments(
                req.session.user,
                'New Tag Type',
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
                ["You are not permitted to create or edit tags."]
            ));
        } else {
            let errorList = validationResult(req);
            let errors: string[] = [];
            if(errorList.isEmpty()) {
                let word: string;
                new Promise((resolve, reject) => {
                    if(req.body.state == 'new') {
                        word = 'created';
                        return dataHandler.addTagType(new TagType(
                            req.body.name,
                            req.body.chue,
                            req.body.ordr
                        ));
                    } else {
                        word = 'updated';
                        return dataHandler.updateTagType(new TagType(
                            req.body.name,
                            req.body.chue,
                            req.body.ordr
                        ));
                    }
                }).then(() => {
                    return getArgumentsSimply(
                        dataHandler, req.session.user, req.query, req.body, 'tagType', req.body.state != 'new', false,
                        [], [`Tag Type ${word} successfully.`]
                    );
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(args => {
                    if(args) {
                        res.render('create-edit', args);
                    }
                });
            }
            if(!errorList.isEmpty() || errors.length > 0) {
                errorList['errors'].forEach((error: any) => {
                    if(error.path == 'name') {
                        if(error.msg == 'empty') {
                            errors.push('Name is blank');
                        }
                    } else if(error.path == 'ordr') {
                        if(error.msg == 'empty') {
                            errors.push('Sort Placement is blank');
                        } else if(error.msg == 'notNumber') {
                            errors.push("Sort Placement is not a valid number")
                        }
                    }
                });
                if(req.body.state == 'new') {
                    getArgumentsSimply(
                        dataHandler, req.session.user, req.query, req.body, 'tagType', false, true, errors
                    ).then(args => res.render('create-edit', args));
                } else {
                    getArgumentsSimply(
                        dataHandler, req.session.user, req.query, req.body, 'tagType', true, true, errors
                    ).then(args => res.render('create-edit', args));
                }
            }
        }
    });

    router.get("/user", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < Role.Admin) {
            res.render("create-edit", getArguments(
                req.session.user,
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
            if(req.query.edit == null) {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'user', false, false
                ).then(args => res.render('create-edit', args));
            } else {
                getArgumentsSimply(
                    dataHandler, req.session.user, req.query, req.body, 'user', true, false
                ).then(args => res.render('create-edit', args));
            }
        }
    });
    router.post("/user",
        body('name')
            .notEmpty().withMessage('empty')
            .isLength({min: 4}).withMessage('short'),
        body('pass')
            .notEmpty().withMessage('empty')
            .isLength({min: 16}).withMessage('short'),
        async function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < Role.Admin) {
            res.render("layout", getArguments(
                req.session.user,
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
                ["You are not permitted to create or edit users."]
            ));
        } else {
            let errorList = validationResult(req);
            let errors: string[] = [];
            let user: User = new User(req.body.name, req.body.role, User.getDefaultConfig());
            user.setPassword('', req.body.pass).then(async () => {
                if(errorList.isEmpty()) {
                    if(req.body.state == 'new') {
                        await dataHandler.addUser(user).then(() => {
                            getArgumentsSimply(
                                dataHandler, req.session.user, req.query, req.body, 'user', false, false,
                                [], ['User created successfully.']
                            ).then(args => res.render('create-edit', args));
                        }, (error:Error) => {
                            errors.push(error.message);
                        });
                    } else {
                        await dataHandler.updateUser(user).then(() => {
                            getArgumentsSimply(
                                dataHandler, req.session.user, req.query, req.body, 'user', false, false,
                                [], ['User updated successfully.']
                            ).then(args => res.render('create-edit', args));
                        }, (error:Error) => {
                            errors.push(error.message);
                        });
                    }
                }
            }, (error:Error) => {
                errors.push('There was an error setting the password.');
            }).finally(() => {
                if(!errorList.isEmpty || errors.length > 0) {
                    errorList['errors'].forEach((error: any) => {
                        if(error.path == 'name') {
                            if(error.msg == 'empty') {
                                errors.push('Username is blank');
                            } else if(error.msg == 'short') {
                                errors.push('Username must be at least 4 characters long.');
                            }
                        } else if(error.path == 'pass') {
                            if(error.msg == 'empty') {
                                errors.push('Password is blank.');
                            } else if(error.msg == 'short') {
                                errors.push('Password must be at least 16 characters long.');
                            }
                        }
                    });
                    if(req.body.state == 'new') {
                        getArgumentsSimply(
                            dataHandler, req.session.user, req.query, req.body, 'user', false, true, errors
                        ).then(args => res.render('create-edit', args));
                    } else {
                        getArgumentsSimply(
                            dataHandler, req.session.user, req.query, req.body, 'user', true, true, errors
                        ).then(args => res.render('create-edit', args));
                    }
                }
            });
        }
    });

    return router;
}

async function getTagTypes(dataHandler: DataHandler): Promise<string[]> {
    let out: string[] = [];
    await dataHandler.searchTagTypes('', -1, 1).then(results => {
        for(let i = 0; i < results.results.length; i++) {
            out.push(results.results[i].name);
        }
    });
    return out;
}

async function getArgumentsSimply(
         dataHandler: DataHandler, user: User, query: any, body: any,
         dataType: string, edit: boolean, post: boolean,
         errors?: string[], successes?: string[], messages?: string[]
    ): Promise<object> {
    let typeName: string = '';
    let page: number = 0;
    let form: object = {};
    let labels: object = {};
    let arrs: object = {};
    let vals: object = {};
    let found = false;
    switch(dataType) {
        case('item'):
            typeName = 'Item';
            page = 5;
            (<any>arrs).pub = ['Public', 'Private'];
            form = edit ? 
                new RetItemHolder('text/dis', 'file', 'url', 'datetime', 'tags', 'text-area', 'radio') :
                new ItemHolder('file', 'url', 'datetime', 'tags', 'text-area', 'radio')
            labels = edit ? 
                new RetItemHolder('Unique ID*', 'Upload', 'Source URL', 'Date and Time*', 'Tags', 'Description', 'Visibility') :
                new ItemHolder('Upload', 'Source URL', 'Date and Time*', 'Tags', 'Description', 'Visibility')
            if(post) {
                vals = edit ? 
                new RetItemHolder(body.id, '', body.src, body.date, body.tags, body.desc, body.pub) :
                new ItemHolder('', body.src, body.date, body.tags, body.desc, body.pub)
            }
            if(edit && post) {
                found = true;
            } else if(edit) {
                await dataHandler.getItem(+query.edit).then(item => {
                    vals = new RetItemHolder(`${item.id}`, '',  item.source, `${new Date(item.date).toISOString().slice(0, 19)}`, item.tags.join(' '), item.desc, item.pub ? 'Public' : 'Private');
                    found = true;
                }, (error:Error) => {
                    if(errors == undefined) {
                        errors = [];
                    }
                    errors.push(`Invalid item id: ${query.edit}`);
                });
            }
        break;
        case('tag'):
            typeName = 'Tag';
            page = 6;
            form = new TagHolder(`text${edit ? '/dis' : ''}`, 'select', 'tag');
            labels = new TagHolder('Name*', 'Type*', 'Parent');
            await getTagTypes(dataHandler).then(types => {
                (<any>arrs).type = types;
            });
            if(post) {
                vals = new TagHolder(body.name, body.type, body.prnt);
            }
            if(edit && post) {
                found = true;
            } else if(edit) {
                await dataHandler.getTag(query.edit).then(tag => {
                    vals = new TagHolder(tag.name, tag.type, tag.parent == null ? '' : tag.parent);
                    found = true;
                }, (error:Error) => {
                    if(errors == undefined) {
                        errors = [];
                    }
                    errors.push(`Invalid tag name: ${query.edit}`);
                });
            }
        break;
        case('tagType'):
            typeName = 'Tag Type';
            page = 7;
            form = new TagTypeHolder(`text${edit ? '/dis' : ''}`, 'hue', 'number');
            labels = new TagTypeHolder('Name*', 'Hue*', 'Sort Order');
            (<any>arrs).chue = colorNames;
            if(post) {
                vals = new TagTypeHolder(body.name, body.chue, body.ordr);
            }
            if(edit && post) {
                found = true;
            } else if(edit) {
                await dataHandler.getTagType(query.edit).then(type => {
                    vals = new TagTypeHolder(type.name, `${type.hue}`, `${type.order}`);
                    found = true;
                }, (error:Error) => {
                    if(errors == undefined) {
                        errors = [];
                    }
                    errors.push(`Invalid tag type name: ${query.edit}`);
                });
            }
        break;
        case('user'):
            typeName = 'User';
            page = 8;
            form = new UserHolder(`text${edit ? '/dis' : ''}`, 'text', 'select');
            labels = new UserHolder('Username*', 'Password*', 'User Role*');
            arrs = {role: ['Normal', 'Family', 'Admin']};
            if(post) {
                vals = new UserHolder(body.name, body.pass, body.role);
            }
            if(edit && post) {
                found = true;
            } else if(edit) {
                await dataHandler.getUser(query.edit).then(user => {
                    vals = new UserHolder(user.username, '', roleToString(user.role));
                    found = true;
                }, (error:Error) => {
                    if(errors == undefined) {
                        errors = [];
                    }
                    errors.push(`Invalid username: ${query.edit}`);
                });
            }
        break;
    }
    return getArguments(
        user,
        `${edit && found ? 'Edit': 'New'} ${typeName}`,
        edit && found ? -1 : page,
        'Required fields are marked by a *',
        '',
        {
            active: false,
            pageURL: '',
            pageCount: 0,
            pageNumber: 0
        },
        edit && found || post ? {
            target: `/post/${dataType}`,
            form: form,
            labels: labels,
            arrs: arrs,
            vals: vals,
            update: edit && found
        } : {
            target: `/post/${dataType}`,
            form: form,
            labels: labels,
            arrs: arrs,
            update: false
        },
        errors,
        successes,
        messages
    );
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