import express, { Router } from "express";
import { body, validationResult } from 'express-validator';

import { DataHandler, User, UserState, SearchResults, PersonalConfig, Item, ItemType, Tag, TagType } from "@rt/data";
import { getCssVars } from "@utl/appColor";

export default function api(dataHandler: DataHandler): Router {
    const router: Router = express.Router();
    
    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200);
        res.send(new Response(statuses.get(200), [], ['Server is up'], [], null));
    });

    router.get('/tags', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let search: string = <string>req.query.match;
        let page: string = <string>req.query.page;
        if (search == undefined) {
            res.status(400);
            res.send(new Response(statuses.get(400), [], ['invalid querry'], [], new SearchResults([], 0, 1, 1)));
        } else {
            if(page == undefined || Number.isNaN(+page)) {
                page = '1';
            }
            dataHandler.searchTags(search, 15, +page).then(tags => {
                let tagNames: string[] = [];
                for(let i = 0; i < tags.results.length; i++) {
                    tagNames.push(tags.results[i].name);
                }
                res.status(200);
                res.send(new Response(statuses.get(200), [], [], [], new SearchResults(tagNames, tags.total, +page, tags.pageCount)));
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], new SearchResults([], 0, 1, 1)));
            });
        }
    });

    router.use('/data', data(dataHandler));

    return router;
}

function data(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.put('/item', 
        body('date')
            .notEmpty().withMessage('empty'),
        async function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if(req.session.user == undefined || req.session.user.role == 0) {
                res.status(401)
                res.send(new Response(statuses.get(401), ['You are not permitted to create or edit items.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                if(req.files == null && req.body.source == '') {
                    errors.push('You must either upload a file or provide a URL');
                }
                if(errorList.isEmpty() && errors.length == 0) {
                    let newID: number;
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
                            return [<string>req.body.src, ''];
                        } else {
                            return dataHandler.reHost((<any>req.files['file']).tempFilePath, (<any>req.files['file']).mimetype, id);
                        }
                    }).then(src => {
                        let item = new Item(
                            newID,
                            src[0],
                            new Date(req.body.date).valueOf(),
                            ItemType.Image,
                            req.body.pub == 'Public',
                            req.body.desc,
                            req.body.tags.split(' ')
                        );
                        item.filePath = src[1];
                        if (req.body.state == 'new') {
                            return dataHandler.addItem(item);
                        } else {
                            return dataHandler.updateItem(item, dataHandler.tagsFromString(req.body.tags));
                        }
                    }, (error:Error) => {
                        errors.push(error.message);
                    }).then(() => {
                        if(errors.length == 0) {
                            res.status(200);
                            res.send(new Response(statuses.get(200), [], [`Item ${word} successfully.`], [], true));
                        }
                    }, (error:Error) => {
                        errors.push(error.message);
                    }).finally(() => {
                        if(!errorList.isEmpty() || errors.length > 0) {
                            errorList['errors'].forEach((error: any) => {
                                if(error.path == 'date') {
                                    if(error.msg == 'empty') {
                                        errors.push('Date is blank');
                                    }
                                }
                            });
                            res.status(500);
                            res.send(new Response(statuses.get(500), errors, [], [], null));
                        }
                    });
                }
            }
        }
    );
    router.delete('/item', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.status(401)
            res.send(new Response(statuses.get(401), ['You are not permitted to delete items.'], [], [], null));
        } else {
            let id: number = +<string>req.query.del;
            let failed = false;
            dataHandler.getItem(id).then(item => {
                return dataHandler.deleteItem(item);
            }, (error:Error) => {
                failed = true;
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                if(!failed) {
                    res.status(200);
                    res.send(new Response(statuses.get(200), [], ['Item deleted successfully'], [], true));
                }
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    router.put('/tag',
        body('name')
            .notEmpty().withMessage('empty'),
        function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if(req.session.user == undefined || req.session.user.role < 1) {
                res.status(401)
                res.send(new Response(statuses.get(401), ['You are not permitted to create or edit tags.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let tagType: TagType;
                let word: string;
                dataHandler.getTagType(req.body.type).then(type => {
                    if(errorList.isEmpty()) {
                        tagType = type;
                        if(req.body.prnt != '') {
                            return dataHandler.getTag(req.body.prnt);
                        } else {
                            return undefined;
                        }
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(parent => {
                    if(errorList.isEmpty() && errors.length == 0) {
                        if(req.body.state == 'new') {
                            word = 'created';
                            return dataHandler.addTag(new Tag(req.body.name, tagType.name, parent ? parent.name : ''));
                        } else {
                            word = 'updated';
                            return dataHandler.updateTag(new Tag(req.body.name, tagType.name, parent ? parent.name : ''));
                        }
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(() => {
                    if(errorList.isEmpty() && errors.length == 0) {
                        res.status(200);
                        res.send(new Response(statuses.get(200), [], [`Tag ${word} successfully.`], [], true));
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).finally(() => {
                    if(!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if(error.path == 'name') {
                                if(error.msg == 'empty') {
                                    errors.push('Name is blank');
                                }
                            }
                        });
                        res.status(500);
                        res.send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/tag', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.status(401)
            res.send(new Response(statuses.get(401), ['You are not permitted to delete tags.'], [], [], null));
        } else {
            let name: string = <string>req.query.del;
            dataHandler.getTag(name).then(tag => {
                return dataHandler.deleteTag(tag);
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200);
                res.send(new Response(statuses.get(200), [], ['Tag deleted successfully'], [], true));
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    router.put("/tagType",
        body('name')
            .notEmpty().withMessage('empty'),
        body('ordr')
            .notEmpty().withMessage('empty')
            .isNumeric().withMessage('notNumber'),
        function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if(req.session.user == undefined || req.session.user.role < 2) {
                res.status(401)
                res.send(new Response(statuses.get(401), ['You are not permitted to create or edit tag types.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let word: string;
                new Promise((resolve, reject) => {
                    if(errorList.isEmpty()) {
                        if(req.body.state == 'new') {
                            word = 'created';
                            resolve(dataHandler.addTagType(new TagType(
                                req.body.name,
                                `${req.body.chueA}:${req.body.chueB}`,
                                req.body.ordr
                            )));
                        } else {
                            word = 'updated';
                            resolve(dataHandler.updateTagType(new TagType(
                                req.body.name,
                                `${req.body.chueA}:${req.body.chueB}`,
                                req.body.ordr
                            )));
                        }
                    }
                }).then(() => {
                    res.status(200);
                    res.send(new Response(statuses.get(200), [], [`Tag Type ${word} successfully.`], [], true));
                }, (error:Error) => {
                    errors.push(error.message);
                }).finally(() => {
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
                        res.status(500);
                        res.send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/tagType', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if(req.session.user == undefined || req.session.user.role < 2) {
            res.status(401)
            res.send(new Response(statuses.get(401), ['You are not permitted to delete tag types.'], [], [], null));
        } else {
            let name: string = <string>req.query.del;
            dataHandler.getTagType(name).then(type => {
                return dataHandler.deleteTagType(type);
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200);
                res.send(new Response(statuses.get(200), [], ['Tag type deleted successfully'], [], true));
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    router.put("/user",
        body('name')
            .notEmpty().withMessage('empty')
            .isLength({min: 4}).withMessage('short'),
        body('pass')
            .notEmpty().withMessage('empty')
            .isLength({min: 16}).withMessage('short'),
        function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if(req.session.user == undefined || req.session.user.role < 2) {
                res.status(401)
                res.send(new Response(statuses.get(401), ['You are not permitted to create or edit users.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let user: User = new User(req.body.name, req.body.role, User.getDefaultConfig());
                let word: string;
                user.setPassword('', req.body.pass).then(async () => {
                    if(errorList.isEmpty()) {
                        if(req.body.state == 'new') {
                            word = 'created';
                            return dataHandler.addUser(user);
                        } else {
                            word = 'updated';
                            return dataHandler.updateUser(user);
                        }
                    }
                }, (error:Error) => {
                    errors.push(error.message);
                }).then(() => {
                    res.status(200);
                    res.send(new Response(statuses.get(200), [], [`User ${word} successfully.`], [], true));
                }, (error:Error) => {
                    errors.push(error.message);
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
                        res.status(500);
                        res.send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/user', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if(req.session.user == undefined || req.session.user.role < 2) {
            res.status(401)
            res.send(new Response(statuses.get(401), ['You are not permitted to delete users.'], [], [], null));
        } else {
            let username: string = <string>req.query.del;
            dataHandler.getUser(username).then(user => {
                return dataHandler.deleteUser(user);
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200);
                res.send(new Response(statuses.get(200), [], ['User deleted successfully'], [], true));
            }, (error:Error) => {
                res.status(500);
                res.send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    return router;
}

class Status {
    code: number;
    description: string;

    constructor(code: number, description: string) {
        this.code = code;
        this.description = description;
    }
}

class Response {
    status: Status;
    errors: string[];
    successes: string[];
    messages: string[];
    returned: any;

    constructor(status: Status, errors: string[], successes: string[], messages: string[], returned: any) {
        this.status = status;
        this.errors = errors;
        this.successes = successes;
        this.messages = messages;
        this.returned = returned;
    }
}

const statuses: Map<number, Status> = new Map();
statuses.set(200, new Status(200, 'OK'));
statuses.set(400, new Status(400, 'Bad Request'));
statuses.set(401, new Status(401, 'Unauthorized'));
statuses.set(500, new Status(500, 'Internal Server Error'));