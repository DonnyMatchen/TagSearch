import express, { Router } from "express";
import { body, validationResult } from 'express-validator';
import { Logger } from "winston";

import { getCssVars, HslColor, lumFromString } from "@da/color";
import { getItemType, Item } from "@da/item";
import { SearchResults } from "@da/search";
import { Tag, TagType } from "@da/tag";
import { PersonalConfig, roleFromString, User, UserState } from "@da/user";
import DataHandler from "@dh/dataHandler";
import { LogMetaData } from "@utl/logHandler";

export default function api(dataHandler: DataHandler, logHandler: Logger): Router {
    const router: Router = express.Router();

    router.get('/', (req, res) => {
        res.setHeader('Content-Type', 'application/json').status(200).send(new Response(statuses.get(200), [], ['Server is up'], [], null));
    });

    router.get('/tags', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let search: string = <string>req.query.match;
        let page: string = <string>req.query.page;
        if (search == undefined) {
            res.status(400).send(new Response(statuses.get(400), [], ['invalid querry'], [], new SearchResults([], 0, 1, 1)));
        } else {
            if (page == undefined || Number.isNaN(+page)) {
                page = '1';
            }
            dataHandler.searchTags(search, 15, +page).then(tags => {
                let tagNames: string[] = [];
                for (let i = 0; i < tags.results.length; i++) {
                    tagNames.push(tags.results[i].name);
                }
                res.status(200).send(new Response(statuses.get(200), [], [], [], new SearchResults(tagNames, tags.total, +page, tags.pageCount)));
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], new SearchResults([], 0, 1, 1)));
            });
        }
    });

    router.put('/color', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let loggedIn = true;
        if (!req.session.user) {
            loggedIn = false;
        }
        let config: PersonalConfig = {
            tagLum: lumFromString(req.body.tagl),
            bg: new HslColor(`${req.body.bgA}:${req.body.bgB}:${req.body.bgC}`),
            fg: new HslColor(`${req.body.fgA}:${req.body.fgB}:${req.body.fgC}`),
            header: new HslColor(`${req.body.hdA}:${req.body.hdB}:${req.body.hdC}`),
            msg: new HslColor(`${req.body.msgA}:${req.body.msgB}:${req.body.msgC}`),
            theme: new HslColor(`${req.body.thmA}:${req.body.thmB}:${req.body.thmC}`),
            bad: new HslColor(`${req.body.bdA}:${req.body.bdB}:${req.body.bdC}`),
            good: new HslColor(`${req.body.gdA}:${req.body.gdB}:${req.body.gdC}`),
        };
        new Promise<void>((resolve, reject) => {
            if (loggedIn) {
                dataHandler.getUser(req.session.user.username).then(user => {
                    user.config = config;
                    req.session.config = config;
                    req.session.user = user;
                    resolve(dataHandler.updateUser(user));
                });
            } else {
                req.session.config = config;
                resolve();
            }
        }).then(() => {
            res.status(200).send(new Response(statuses.get(200), [], ['Settings saved.'], [], null));
        });
    });

    router.post('/color', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let loggedIn = true;
        if (!req.session.user) {
            loggedIn = false;
        }
        let config: PersonalConfig = {
            tagLum: lumFromString(req.body.tagl),
            bg: new HslColor(`${req.body.bgA}:${req.body.bgB}:${req.body.bgC}`),
            fg: new HslColor(`${req.body.fgA}:${req.body.fgB}:${req.body.fgC}`),
            header: new HslColor(`${req.body.hdA}:${req.body.hdB}:${req.body.hdC}`),
            msg: new HslColor(`${req.body.msgA}:${req.body.msgB}:${req.body.msgC}`),
            theme: new HslColor(`${req.body.thmA}:${req.body.thmB}:${req.body.thmC}`),
            bad: new HslColor(`${req.body.bdA}:${req.body.bdB}:${req.body.bdC}`),
            good: new HslColor(`${req.body.gdA}:${req.body.gdB}:${req.body.gdC}`),
        };
        res.status(200).send(new Response(statuses.get(200), [], [], [], getCssVars(config)));
    });

    router.use('/data', data(dataHandler));
    router.use('/admin', admin(dataHandler, logHandler));

    router.all('*', (req, res) => {
        res.status(404).send(new Response(statuses.get(404), [], [], [], null));
    });

    return router;
}

function admin(dataHandler: DataHandler, logHandler: Logger): Router {
    const router: Router = express.Router();

    router.put('/passChange',
        body('oPass')
            .notEmpty().withMessage('empty'),
        body('nPass1')
            .notEmpty().withMessage('empty')
            .isLength({ min: 16 }).withMessage('short'),
        body('nPass2')
            .notEmpty().withMessage('empty')
            .isLength({ min: 16 }).withMessage('short'),
        (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (!req.session.user) {
                res.status(400).send(new Response(statuses.get(400), ['You are not logged in.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let oldPass: string = req.body.oPass;
                let newPass1: string = req.body.nPass1;
                let newPass2: string = req.body.nPass2;
                if (newPass1 != newPass2) {
                    errors.push('Passwords do nto match.');
                }
                dataHandler.getUser(req.session.user.username).then(user => {
                    return new Promise<string>((resolve, reject) => {
                        if (errorList.isEmpty() && errors.length == 0) {
                            user.setPassword(oldPass, newPass1).then(() => {
                                return dataHandler.updateUser(user);
                            }, (error: Error) => {
                                errors.push(error.message);
                                reject();
                            }).then(() => {
                                logHandler.info(`Password change for ${user.username} from host ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`, new LogMetaData('api.admin'));
                                resolve('Password chagned successfully!');
                            }, (error: Error) => {
                                errors.push(error.message);
                                reject();
                            });
                        } else {
                            reject();
                        }
                    });
                }, (error: Error) => {
                    errors.push(error.message);
                }).then(message => {
                    if (message) {
                        res.status(200).send(new Response(statuses.get(200), [], [message], [], true));
                    }
                }).finally(() => {
                    if (!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if (error.path == 'oPass') {
                                if (error.msg == 'empty') {
                                    errors.push('Old password is blank');
                                }
                            } else if (error.path == 'nPass1') {
                                if (error.msg == 'empty') {
                                    errors.push('New password is blank');
                                } else if (error.msg == 'short') {
                                    errors.push('New password is shorter than 16 characters.');
                                }
                            } else if (error.path == 'nPass2') {
                                if (error.msg == 'empty') {
                                    errors.push('New password re-entry is blank');
                                } else if (error.msg == 'short') {
                                    errors.push('New password re-entry is shorter than 16 characters.');
                                }
                            }
                        });
                        res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });;
            }
        });
    router.put('/activate',
        body('uname')
            .notEmpty().withMessage('empty'),
        body('pass1')
            .notEmpty().withMessage('empty')
            .isLength({ min: 16 }).withMessage('short'),
        body('pass2')
            .notEmpty().withMessage('empty')
            .isLength({ min: 16 }).withMessage('short'),
        (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            let errorList = validationResult(req);
            let errors: string[] = [];
            let username: string = req.body.uname;
            let newPass1: string = req.body.Pass1;
            let newPass2: string = req.body.Pass2;
            if (newPass1 != newPass2) {
                errors.push('Passwords do not match.');
            }
            dataHandler.getUser(username).then(user => {
                if (user) {
                    if (user.state == UserState.New) {
                        return new Promise<string>((resolve, reject) => {
                            if (errorList.isEmpty() && errors.length == 0) {
                                user.setPassword('', newPass1).then(() => {
                                    return dataHandler.updateUser(user);
                                }, (error: Error) => {
                                    errors.push(error.message);
                                    reject();
                                }).then(() => {
                                    logHandler.info(`Password set for ${user.username} from host ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`, new LogMetaData('api.admin'));
                                    resolve('Password Set successfully!');
                                }, (error: Error) => {
                                    errors.push(error.message);
                                    reject();
                                });
                            } else {
                                reject();
                            }
                        });
                    } else {
                        errors.push('The username is already activated, or does not exist.');
                    }
                } else {
                    errors.push('The username is already activated, or does not exist.');
                }
            }, (error: Error) => {
                errors.push(error.message);
            }).then(message => {
                if (message) {
                    res.status(200).send(new Response(statuses.get(200), [], [message], [], true));
                }
            }).finally(() => {
                if (!errorList.isEmpty() || errors.length > 0) {
                    errorList['errors'].forEach((error: any) => {
                        if (error.path == 'uname') {
                            if (error.msg == 'empty') {
                                errors.push('Username is blank.');
                            }
                        } else if (error.path == 'pass1') {
                            if (error.msg == 'empty') {
                                errors.push('Password is blank.');
                            } else if (error.msg == 'short') {
                                errors.push('Password is shorter than 16 characters.');
                            }
                        } else if (error.path == 'nPass2') {
                            if (error.msg == 'empty') {
                                errors.push('Password re-entry is blank.');
                            } else if (error.msg == 'short') {
                                errors.push('Password re-entry is shorter than 16 characters.');
                            }
                        }
                    });
                    res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                }
            });;
        });

    return router;
}

function data(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.put('/item',
        body('date')
            .notEmpty().withMessage('empty'),
        async function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if (req.session.user == undefined || req.session.user.role == 0) {
                res.status(401).send(new Response(statuses.get(401), ['You are not permitted to create or edit items.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                if (req.files == null && req.body.source == '') {
                    errors.push('You must either upload a file or provide a URL');
                }
                if (errorList.isEmpty() && errors.length == 0) {
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
                        if (!req.files) {
                            return new Promise<string[]>((resolve1, reject1) => {
                                if (req.body.state == 'new') {
                                    resolve1([<string>req.body.src, '']);
                                } else {
                                    dataHandler.getItem(id).then(old => {
                                        if (old.source == req.body.src) {
                                            resolve1([old.source, old.filePath]);
                                        } else {
                                            resolve1([<string>req.body.src, '']);
                                        }
                                    });
                                }
                            });
                        } else {
                            let fileNameParts = (<string>(<any>req.files['file']).name).split('.');
                            return dataHandler.reHost((<any>req.files['file']).tempFilePath, (<any>req.files['file']).mimetype, `.${fileNameParts[fileNameParts.length - 1]}`, id);
                        }
                    }).then(src => {
                        let item = new Item(
                            newID,
                            src[0],
                            new Date(req.body.date).valueOf(),
                            getItemType(src[0]),
                            req.body.pub == 'Public',
                            req.body.desc,
                            req.body.tags.trim().split(' '),
                            src[1]
                        );
                        item.filePath = src[1];
                        if (req.body.state == 'new') {
                            return dataHandler.addItem(item);
                        } else {
                            return dataHandler.updateItem(item, dataHandler.tagsFromString(req.body.tags));
                        }
                    }, (error: Error) => {
                        errors.push(error.message);
                    }).then(() => {
                        if (errors.length == 0) {
                            res.status(200).send(new Response(statuses.get(200), [], [`Item ${word} successfully.`], [], true));
                        }
                    }, (error: Error) => {
                        errors.push(error.message);
                    }).finally(() => {
                        if (!errorList.isEmpty() || errors.length > 0) {
                            errorList['errors'].forEach((error: any) => {
                                if (error.path == 'date') {
                                    if (error.msg == 'empty') {
                                        errors.push('Date is blank');
                                    }
                                }
                            });
                            res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                        }
                    });
                }
            }
        }
    );
    router.delete('/item', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.session.user == undefined || req.session.user.role < 1) {
            res.status(401).send(new Response(statuses.get(401), ['You are not permitted to delete items.'], [], [], null));
        } else {
            let id: number = +<string>req.query.del;
            let failed = false;
            dataHandler.getItem(id).then(item => {
                return dataHandler.deleteItem(item);
            }, (error: Error) => {
                failed = true;
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                if (!failed) {
                    res.status(200).send(new Response(statuses.get(200), [], ['Item deleted successfully'], [], true));
                }
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    router.put('/tag',
        body('name')
            .notEmpty().withMessage('empty'),
        function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if (req.session.user == undefined || req.session.user.role < 1) {
                res.status(401).send(new Response(statuses.get(401), ['You are not permitted to create or edit tags.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let tagType: TagType;
                let word: string;
                dataHandler.getTagType(req.body.type).then(type => {
                    if (errorList.isEmpty()) {
                        tagType = type;
                        if (req.body.prnt != '') {
                            return dataHandler.getTag(req.body.prnt);
                        } else {
                            return undefined;
                        }
                    }
                }, (error: Error) => {
                    errors.push(error.message);
                }).then(parent => {
                    if (errorList.isEmpty() && errors.length == 0) {
                        if (req.body.state == 'new') {
                            word = 'created';
                            return dataHandler.addTag(new Tag(req.body.name, tagType.name, parent ? parent.name : ''));
                        } else {
                            word = 'updated';
                            return dataHandler.updateTag(new Tag(req.body.name, tagType.name, parent ? parent.name : ''), true);
                        }
                    }
                }, (error: Error) => {
                    errors.push(error.message);
                }).then(() => {
                    if (errorList.isEmpty() && errors.length == 0) {
                        res.status(200).send(new Response(statuses.get(200), [], [`Tag ${word} successfully.`], [], true));
                    }
                }, (error: Error) => {
                    errors.push(error.message);
                }).finally(() => {
                    if (!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if (error.path == 'name') {
                                if (error.msg == 'empty') {
                                    errors.push('Name is blank');
                                }
                            }
                        });
                        res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/tag', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.session.user == undefined || req.session.user.role < 1) {
            res.status(401).send(new Response(statuses.get(401), ['You are not permitted to delete tags.'], [], [], null));
        } else {
            let name: string = <string>req.query.del;
            dataHandler.getTag(name).then(tag => {
                return dataHandler.deleteTag(tag);
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200).send(new Response(statuses.get(200), [], ['Tag deleted successfully'], [], true));
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
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
            if (req.session.user == undefined || req.session.user.role < 2) {
                res.status(401).send(new Response(statuses.get(401), ['You are not permitted to create or edit tag types.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let word: string;
                new Promise((resolve, reject) => {
                    if (errorList.isEmpty()) {
                        if (req.body.state == 'new') {
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
                    res.status(200).send(new Response(statuses.get(200), [], [`Tag Type ${word} successfully.`], [], true));
                }, (error: Error) => {
                    errors.push(error.message);
                }).finally(() => {
                    if (!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if (error.path == 'name') {
                                if (error.msg == 'empty') {
                                    errors.push('Name is blank');
                                }
                            } else if (error.path == 'ordr') {
                                if (error.msg == 'empty') {
                                    errors.push('Sort Placement is blank');
                                } else if (error.msg == 'notNumber') {
                                    errors.push("Sort Placement is not a valid number")
                                }
                            }
                        });
                        res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/tagType', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.session.user == undefined || req.session.user.role < 2) {
            res.status(401).send(new Response(statuses.get(401), ['You are not permitted to delete tag types.'], [], [], null));
        } else {
            let name: string = <string>req.query.del;
            dataHandler.getTagType(name).then(type => {
                return dataHandler.deleteTagType(type);
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200).send(new Response(statuses.get(200), [], ['Tag type deleted successfully'], [], true));
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            });;
        }
    });

    router.put('/user',
        body('name')
            .notEmpty().withMessage('empty')
            .isLength({ min: 4 }).withMessage('short'),
        function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            if (!req.session.user || req.session.user.role < 2) {
                res.status(401).send(new Response(statuses.get(401), ['You are not permitted to create or edit users.'], [], [], null));
            } else {
                let errorList = validationResult(req);
                let errors: string[] = [];
                let setPass: boolean = req.body.pass && req.body.pass != '';
                let user: User = new User(req.body.name, roleFromString(req.body.role), User.getDefaultConfig());
                let word: string;
                new Promise<void>((resolve, reject) => {
                    if (setPass) {
                        if ((<string>req.body.pass).length >= 16) {
                            user.setPassword('', req.body.pass).then(() => {
                                resolve();
                            }, error => reject(error));
                        } else {
                            reject(new Error('Password must be at least 16 characters long.'));
                        }
                    } else {
                        resolve();
                    }
                }).then(() => {
                    return new Promise((resolve, reject) => {
                        if (errorList.isEmpty()) {
                            if (req.body.state == 'new') {
                                word = 'created';
                                resolve(dataHandler.addUser(user));
                            } else {
                                word = 'updated';
                                dataHandler.getUser(user.username).then(old => {
                                    user.config = old.config;
                                    if (!setPass) {
                                        user.hash = old.hash;
                                        user.salt = old.salt;
                                    }
                                    resolve(dataHandler.updateUser(user));
                                }, error => reject(error));
                            }
                        }
                    });
                }, (error: Error) => errors.push(error.message)).then(() => {
                    if (errorList.isEmpty() && errors.length == 0) {
                        res.status(200).send(new Response(statuses.get(200), [], [`User ${word} successfully.`], [], true));
                    }
                }, (error: Error) => {
                    errors.push(error.message);
                }).finally(() => {
                    if (!errorList.isEmpty() || errors.length > 0) {
                        errorList['errors'].forEach((error: any) => {
                            if (error.path == 'name') {
                                if (error.msg == 'empty') {
                                    errors.push('Username is blank');
                                } else if (error.msg == 'short') {
                                    errors.push('Username must be at least 4 characters long.');
                                }
                            }
                        });
                        res.status(500).send(new Response(statuses.get(500), errors, [], [], null));
                    }
                });
            }
        }
    );
    router.delete('/user', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.session.user == undefined || req.session.user.role < 2) {
            res.status(401).send(new Response(statuses.get(401), ['You are not permitted to delete users.'], [], [], null));
        } else {
            let username: string = <string>req.query.del;
            dataHandler.getUser(username).then(user => {
                return dataHandler.deleteUser(user);
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
            }).then(() => {
                res.status(200).send(new Response(statuses.get(200), [], ['User deleted successfully'], [], true));
            }, (error: Error) => {
                res.status(500).send(new Response(statuses.get(500), [error.message], [], [], null));
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
statuses.set(404, new Status(404, 'Not Found'));
statuses.set(500, new Status(500, 'Internal Server Error'));