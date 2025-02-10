import { Arguments } from '@utl/getArguments';
import fs from 'fs';
import path from "path";
import { Pool, PoolClient } from 'pg';

import { DataHandler, Item, Role, SearchOptions, SearchResults, Tag, TagType, User, getRandomHexString, getRandomString } from '@rt/data';

export default class PGDB extends DataHandler {
    private pool: Pool;
    public client: PoolClient;

    constructor(username: string, password: string, host: string, port: number, database: string) {
        super();
        this.pool = new Pool({
            user: username,
            password: password,
            host: host,
            port: port,
            database: database
        });
    }

    async init() {
        return new Promise<void>((resolve, reject) => {
            new Promise<void>((resolve1, reject1) => {
                this.pool.connect().then(client => {
                    this.client = client;
                    resolve1();
                }, (error: Error) => {
                    console.log(`[Server:DB]: Failed to connect: ${error.message}`);
                    reject(error);
                });
            }).then(() => this.client.query(`SELECT * FROM items LIMIT 1`)).then(null, (error: Error) => {
                if (error.message == 'relation "items" does not exist') {
                    this.client.query(`CREATE TABLE items(
                        id INT PRIMARY KEY,
                        src TEXT,
                        dt BIGINT,
                        tags TEXT,
                        des TEXT,
                        typ INT,
                        pub BOOLEAN,
                        fp TEXT
                    )`);
                } else {
                    console.log(`[Server:DB] Failed to query: ${error.message}`);
                    reject(error);
                }
            }).then(() => this.client.query(`SELECT * FROM tags LIMIT 1`)).then(null, (error: Error) => {
                if (error.message == 'relation "tags" does not exist') {
                    this.client.query(`CREATE TABLE tags(
                        name TEXT PRIMARY KEY,
                        typ TEXT,
                        prnt TEXT,
                        cldn TEXT,
                        refs TEXT
                    )`);
                } else {
                    console.log(`[Server:DB] Failed to query: ${error.message}`);
                    reject(error);
                }
            }).then(() => this.client.query(`SELECT * FROM tag_types LIMIT 1`)).then(null, (error: Error) => {
                if (error.message == 'relation "tag_types" does not exist') {
                    this.client.query(`CREATE TABLE tag_types(
                        name TEXT PRIMARY KEY,
                        clr TEXT,
                        ordr INT
                    )`);
                } else {
                    console.log(`[Server:DB] Failed to query: ${error.message}`);
                    reject(error);
                }
            }).then(() => this.client.query(`SELECT * FROM users LIMIT 1`)).then(() => resolve(), (error: Error) => {
                if (error.message == 'relation "users" does not exist') {
                    this.client.query(`CREATE TABLE users(
                        uname TEXT PRIMARY KEY,
                        state INT,
                        hash TEXT,
                        salt TEXT,
                        role INT,
                        conf TEXT
                    )`);
                    resolve();
                } else {
                    console.log(`[Server:DB] Failed to query: ${error.message}`);
                    reject(error);
                }
            });
        });
    }

    async nextItemID(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.query('SELECT id FROM items ORDER BY id DESC LIMIT 1;').then(result => {
                if (result.rowCount == 1) {
                    resolve(result.rows[0].id + 1);
                } else {
                    resolve(1);
                }
            });
        });
    }
    generateSessionID(): string {
        return getRandomString(30);
    }
    getPageLimit(): number {
        return 30;
    }

    //resolve
    private resolveTagType(raw: any) {
        return new TagType(this.sqlUnEscape(raw.name), raw.clr, raw.ordr);
    }
    private resolveTag(raw: any) {
        return new Tag(
            this.sqlUnEscape(raw.name),
            raw.typ,
            this.sqlUnEscape(raw.prnt),
            raw.refs.split(' '),
            this.sqlUnEscape(raw.cldn).split(' ')
        );
    }
    private resolveItem(raw: any): Item {
        return new Item(
            raw.id,
            this.sqlUnEscape(raw.src),
            +(<string>raw.dt),
            raw.typ,
            raw.pub,
            this.sqlUnEscape(raw.des),
            this.sqlUnEscape(raw.tags).split(' '),
            this.sqlUnEscape(raw.fp)
        );
    }
    private resolveUser(raw: any): User {
        return new User(
            this.sqlUnEscape(raw.uname),
            raw.role,
            this.sqlUnEscape(raw.conf),
            this.sqlUnEscape(raw.hash),
            this.sqlUnEscape(raw.salt)
        );
    }

    //get
    async getTagType(name: string): Promise<TagType> {
        return new Promise<TagType>((resolve, reject) => {
            this.client.query(`SELECT * FROM tag_types WHERE name = '${this.sqlEscape(name)}'`).then(result => {
                if (result.rows.length >= 1) {
                    resolve(this.resolveTagType(result.rows[0]));
                } else {
                    resolve(undefined);
                }
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getTag(name: string): Promise<Tag> {
        return new Promise<Tag>((resolve, reject) => {
            this.client.query(`SELECT * FROM tags WHERE name = '${this.sqlEscape(name)}'`).then(result => {
                if (result.rows.length >= 1) {
                    resolve(this.resolveTag(result.rows[0]));
                } else {
                    resolve(undefined);
                }
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getItem(id: number): Promise<Item> {
        return new Promise<Item>((resolve, reject) => {
            this.client.query(`SELECT * FROM items WHERE id = ${id}`).then(result => {
                if (result.rows.length >= 1) {
                    resolve(this.resolveItem(result.rows[0]));
                } else {
                    resolve(undefined);
                }
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getUser(username: string): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            this.client.query(`SELECT * FROM users WHERE uname = '${this.sqlEscape(username)}'`).then(result => {
                if (result.rows.length >= 1) {
                    resolve(this.resolveUser(result.rows[0]));
                } else {
                    resolve(undefined);
                }
            }, (error: Error) => {
                reject(error);
            });
        });
    }

    //get multiple
    async getTagTypes(names: string[]): Promise<TagType[]> {
        return new Promise<TagType[]>((resolve, reject) => {
            this.client.query(`SELECT * FROM tag_types WHERE name IN ('${this.sqlMultiEscape(names).join("','")}')`).then(result => {
                let out: TagType[] = [];
                for (let i = 0; i < result.rowCount; i++) {
                    out.push(this.resolveTagType(result.rows[i]));
                }
                resolve(out);
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getTags(names: string[]): Promise<Tag[]> {
        return new Promise<Tag[]>((resolve, reject) => {
            let query = `SELECT * FROM tags WHERE name IN ('${this.sqlMultiEscape(names).join("','")}')`;
            this.client.query(query).then(result => {
                let out: Tag[] = [];
                for (let i = 0; i < result.rowCount; i++) {
                    out.push(this.resolveTag(result.rows[i]));
                }
                resolve(out);
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getItems(ids: number[]): Promise<Item[]> {
        return new Promise<Item[]>((resolve, reject) => {
            this.client.query(`SELECT * FROM items WHERE id IN (${ids.join(',')})`).then(result => {
                let out: Item[] = [];
                for (let i = 0; i < result.rowCount; i++) {
                    out.push(this.resolveItem(result.rows[i]));
                }
                resolve(out);
            }, (error: Error) => {
                reject(error);
            });
        });
    }
    async getUsers(usernames: string[]): Promise<User[]> {
        return new Promise<User[]>((resolve, reject) => {
            this.client.query(`SELECT * FROM users WHERE Uname IN ('${this.sqlMultiEscape(usernames).join("','")}')`).then(result => {
                let out: User[] = [];
                for (let i = 0; i < result.rowCount; i++) {
                    out.push(this.resolveUser(result.rows[i]));
                }
                resolve(out);
            }, (error: Error) => {
                reject(error);
            });
        });
    }

    //search
    async searchTagTypes(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<TagType>> {
        return new Promise((resolve, reject) => {
            let total: number = 0;
            let query = `SELECT * FROM tag_types
                ${search == '' ? '' : ` WHERE name LIKE '%${this.sqlEscape(search)}%'`}
                ORDER BY ordr ASC
                ${pageSize <= 0 ? '' : ` LIMIT ${pageSize} OFFSET ${(pageNumber - 1) * pageSize}`}`;
            let count = `SELECT COUNT(*) FROM tag_types${search == '' ? '' : ` WHERE name LIKE '%${this.sqlEscape(search)}%'`}`;
            this.client.query(count).then(count => {
                total = count.rows[0].count;
                return this.client.query(query);
            }, error => {
                reject(error);
            }).then(results => {
                if (results) {
                    let out: TagType[] = [];
                    for (let i = 0; i < results.rows.length; i++) {
                        out.push(this.resolveTagType(results.rows[i]));
                    }
                    if (pageSize <= 0) {
                        resolve(new SearchResults(out, out.length, 1, 1));
                    } else {
                        resolve(new SearchResults(
                            out,
                            total,
                            pageNumber,
                            (total - (total % pageSize)) / pageSize + (total % pageSize == 0 ? 0 : 1)
                        ));
                    }
                } else {
                    reject(new Error('Something went wrong.'));
                }
            }, error => {
                reject(error);
            });
        });
    }
    async searchTags(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<Tag>> {
        return new Promise((resolve, reject) => {
            let total: number = 0;
            let query = `SELECT * FROM tags
                ${search == '' ? '' : ` WHERE name LIKE '%${this.sqlEscape(search)}%'`}
                ORDER BY name ASC
                ${pageSize <= 0 ? '' : ` LIMIT ${pageSize} OFFSET ${(pageNumber - 1) * pageSize}`}`;
            let count = `SELECT COUNT(*) FROM tags${search == '' ? '' : ` WHERE name LIKE '%${this.sqlEscape(search)}%'`}`;
            this.client.query(count).then(count => {
                total = count.rows[0].count;
                return this.client.query(query);
            }, error => {
                reject(error);
            }).then(results => {
                if (results) {
                    let out: Tag[] = [];
                    for (let i = 0; i < results.rows.length; i++) {
                        out.push(this.resolveTag(results.rows[i]));
                    }
                    if (pageSize <= 0) {
                        resolve(new SearchResults(out, out.length, 1, 1));
                    } else {
                        resolve(new SearchResults(
                            out,
                            total,
                            pageNumber,
                            (total - (total % pageSize)) / pageSize + (total % pageSize == 0 ? 0 : 1)
                        ));
                    }
                } else {
                    reject(new Error('Something went wrong.'));
                }
            }, error => {
                reject(error);
            });
        });
    }
    async searchItems(search: string, pageSize: number, pageNumber: number, user: User): Promise<SearchResults<Item>> {
        return new Promise((resolve, reject) => {
            let total: number = 0;
            let query: string;
            let count: string;
            new Promise<string>((resolve1, reject1) => {
                let str = ``;
                if (search == '') {
                    if (user && user.role >= 1) {
                        resolve1('');
                    } else {
                        resolve1(` WHERE pub`)
                    }
                } else {
                    this.reduce(search).then(ids => {
                        if (user && user.role >= 1) {
                            resolve1(` WHERE id IN(${ids.join(',')})`);
                        } else {
                            resolve1(` WHERE pub AND id IN (${ids.join(',')})`);
                        }
                    }, error => { reject(error) });
                }
            }).then(filter => {
                query = `SELECT * FROM items
                    ${filter}
                    ORDER BY id DESC
                    ${pageSize <= 0 ? '' : ` LIMIT ${pageSize} OFFSET ${(pageNumber - 1) * pageSize}`}`;
                count = `SELECT COUNT(*) FROM items${filter}`;
                return this.client.query(count)
            }).then(count => {
                total = count.rows[0].count;
                return this.client.query(query);
            }, error => {
                reject(error);
            }).then(results => {
                if (results) {
                    let out: Item[] = [];
                    for (let i = 0; i < results.rows.length; i++) {
                        out.push(this.resolveItem(results.rows[i]));
                    }
                    if (pageSize <= 0) {
                        resolve(new SearchResults(out, out.length, 1, 1));
                    } else {
                        resolve(new SearchResults(
                            out,
                            total,
                            pageNumber,
                            (total - (total % pageSize)) / pageSize + (total % pageSize == 0 ? 0 : 1)
                        ));
                    }
                } else {
                    reject(new Error('Something went wrong.'));
                }
            }, error => {
                reject(error);
            });;
        });
    }
    async searchUsers(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<User>> {
        return new Promise((resolve, reject) => {
            let total: number = 0;
            let query = `SELECT * FROM users
                ${search == '' ? '' : ` WHERE uname LIKE '%${this.sqlEscape(search)}%'`}
                ORDER BY role DESC, uname ASC
                ${pageSize <= 0 ? '' : ` LIMIT ${pageSize} OFFSET ${(pageNumber - 1) * pageSize}`}`;
            let count = `SELECT COUNT(*) FROM users${search == '' ? '' : ` WHERE uname LIKE '%${this.sqlEscape(search)}%'`}`;
            this.client.query(count).then(count => {
                total = count.rows[0].count;
                return this.client.query(query);
            }, error => {
                reject(error);
            }).then(results => {
                if (results) {
                    let out: User[] = [];
                    for (let i = 0; i < results.rows.length; i++) {
                        out.push(this.resolveUser(results.rows[i]));
                    }
                    if (pageSize <= 0) {
                        resolve(new SearchResults(out, out.length, 1, 1));
                    } else {
                        resolve(new SearchResults(
                            out,
                            total,
                            pageNumber,
                            (total - (total % pageSize)) / pageSize + (total % pageSize == 0 ? 0 : 1)
                        ));
                    }
                } else {
                    reject(new Error('Something went wrong.'));
                }
            }, error => {
                reject(error);
            });
        });
    }

    //add
    async addTagType(type: TagType) {
        return new Promise<void>((resolve, reject) => {
            this.client.query(`INSERT INTO tag_types (name, clr, ordr)
                VALUES ('${this.sqlEscape(type.name)}', '${type.color.encoded}', ${type.order})`)
                .then(result => {
                    resolve();
                }, error => {
                    reject(error);
                });
        });
    }
    async addTag(tag: Tag) {
        return new Promise<void>((resolve, reject) => {
            let parent: Tag;
            new Promise<void>((resolve1, reject1) => {
                if (tag.parent != '') {
                    this.getTag(tag.parent).then(prnt => {
                        if (prnt) {
                            parent = prnt;
                            prnt.addChild(tag.name);
                            resolve1(this.updateTag(prnt));
                        }
                    });
                } else {
                    resolve1();
                }
            }).then(() => {
                let type: string = parent ? parent.type : tag.type;
                return this.client.query(`INSERT INTO tags (name, typ, prnt, cldn, refs)
                    VALUES ('${this.sqlEscape(tag.name)}', '${this.sqlEscape(type)}', '${this.sqlEscape(tag.parent)}', '${this.sqlEscape(tag.children.join(' '))}', '${tag.refs.join(' ')}')`);
            }, error => reject(error)).then(result => {
                resolve();
            }, error => {
                reject(error);
            });
        });
    }
    async addItem(item: Item) {
        return new Promise<void>((resolve, reject) => {
            this.changeTags([], item.tags, item.id).then(() => {
                let query = `INSERT INTO items (id, src, dt, tags, des, typ, pub, fp)
                    VALUES (
                    ${item.id},
                    '${this.sqlEscape(item.source)}',
                    ${item.date},
                    '${this.sqlEscape(item.tags.sort((a, b) => { return a.localeCompare(b) }).join(' '))}',
                    '${this.sqlEscape(item.desc)}',
                    ${item.type},
                    ${item.pub},
                    '${this.sqlEscape(item.filePath)}')`;
                this.client.query(query)
                    .then(result => {
                        resolve();
                    }, error => {
                        reject(error);
                    });
            });
        });
    }
    async addUser(user: User) {
        return new Promise<void>((resolve, reject) => {
            this.client.query(`INSERT INTO users (uname, state, hash, salt, role, conf)
                VALUES (
                '${this.sqlEscape(user.username)}',
                ${user.state},
                '${this.sqlEscape(user.hash)}',
                '${this.sqlEscape(user.salt)}',
                ${user.role},
                '${this.sqlEscape(JSON.stringify(user.config))}'
                )`)
                .then(result => {
                    resolve();
                }, error => {
                    reject(error);
                });
        });
    }

    //update
    async updateTagType(type: TagType) {
        new Promise<void>((resolve, reject) => {
            this.getTagType(type.name).then(typ => {
                if (typ) {
                    let query: string = `UPDATE tag_types SET
                        clr = '${type.color.encoded}',
                        ordr = ${type.order}
                    WHERE name = '${this.sqlEscape(type.name)}'`;
                    this.client.query(query).then(result => {
                        resolve();
                    }, (error: Error) => {
                        reject(error);
                    });
                } else {
                    resolve(this.addTagType(type));
                }
            });
        });
    }
    async updateTag(tag: Tag) {
        return new Promise<void>((resolve, reject) => {
            this.getTag(tag.name).then(old => {
                if (!old) {
                    resolve(this.addTag(tag));
                } else {
                    new Promise<void>((resolve1, reject1) => {
                        if (old.parent != tag.parent && old.parent != '') {
                            this.getTag(old.parent).then(oldParent => {
                                oldParent.removeChild(old.name);
                                resolve1(this.updateTag(oldParent));
                            });
                        } else {
                            resolve1();
                        }
                    }).then(() => {
                        return new Promise<void>((resolve1, reject1) => {
                            if (old.parent != tag.parent && tag.parent != '') {
                                this.getTag(tag.parent).then(newParent => {
                                    newParent.addChild(tag.name);
                                    resolve1(this.updateTag(newParent));
                                });
                            } else {
                                resolve1();
                            }
                        });
                    }).then(() => {
                        return new Promise<void[]>((resolve1, reject1) => {
                            if (tag.type != old.type && tag.children.length > 0) {
                                let children: Promise<void>[] = [];
                                for (let i = 0; i < tag.children.length; i++) {
                                    this.getTag(tag.children[i]).then(child => {
                                        child.type = tag.type;
                                        children.push(this.updateTag(child));
                                    });
                                }
                                resolve1(Promise.all(children));
                            } else {
                                resolve1(null);
                            }
                        })
                    }).then(() => {
                        let query: string = `UPDATE tags SET 
                            typ = '${this.sqlEscape(tag.type)}',
                            prnt = '${this.sqlEscape(tag.parent)}',
                            cldn = '${this.sqlEscape(tag.children.join(' '))}',
                            refs = '${tag.refs.join(' ')}'
                            WHERE name = '${this.sqlEscape(tag.name)}'`;
                        this.client.query(query).then(result => {
                            resolve();
                        }, (error: Error) => {
                            reject(error);
                        });
                    });
                }
            });
        });
    }
    async updateItem(item: Item) {
        new Promise<void>((resolve, reject) => {
            this.getItem(item.id).then(old => {
                if (old) {
                    this.changeTags(old.tags, item.tags, item.id).then(() => {
                        return new Promise<void>((resolve1, reject1) => {
                            if (old.filePath != item.filePath && old.filePath != '') {
                                fs.rm(old.filePath, (error) => {
                                    if (error) {
                                        console.log(`[Server:DB] Cleanup required (${old.filePath})`);
                                        reject(error);
                                    } else {
                                        resolve1();
                                    }
                                });
                            } else {
                                resolve1();
                            }
                        });
                    }).then(() => {
                        let query: string = `UPDATE items SET
                            src = '${this.sqlEscape(item.source)}',
                            dt = ${item.date},
                            tags = '${this.sqlEscape(item.tags.sort((a, b) => { return a.localeCompare(b) }).join(' '))}',
                            des = '${this.sqlEscape(item.desc)}',
                            typ = ${item.type},
                            pub = ${item.pub},
                            fp = '${this.sqlEscape(item.filePath)}'
                            WHERE id = ${item.id}`;
                        this.client.query(query).then(result => {
                            resolve();
                        }, (error: Error) => {
                            reject(error);
                        });
                    });
                } else {
                    resolve(this.addItem(item));
                }
            });
        });
    }
    async updateUser(user: User) {
        new Promise<void>((resolve, reject) => {
            this.getUser(user.username).then(usr => {
                if (usr) {
                    let query: string = `UPDATE users SET
                        state = ${user.state},
                        hash = '${this.sqlEscape(user.hash)}',
                        salt = '${this.sqlEscape(user.salt)}',
                        role = ${user.role},
                        conf = '${this.sqlEscape(JSON.stringify(user.config))}'
                        WHERE uname = '${this.sqlEscape(user.username)}'`;
                    this.client.query(query).then(result => {
                        resolve();
                    }, (error: Error) => {
                        reject(error);
                    });
                } else {
                    resolve(this.addUser(user));
                }
            });
        });
    }

    //delete
    async deleteTagType(type: TagType) {
        return new Promise<void>((resolve, reject) => {
            if (type.name == 'default') {
                reject(new Error('You cannot delete the default tag type.'));
            } else {
                this.searchTags('', -1, 1).then(result => {
                    let altering: Promise<void>[] = [];
                    for (let i = 0; i < result.results.length; i++) {
                        let tag = result.results[i];
                        if (tag.type == type.name) {
                            tag.type = 'default';
                            altering.push(this.updateTag(tag));
                        }
                    }
                    return Promise.all(altering);
                }, error => reject(error)).then(() => {
                    return this.client.query(`DELETE FROM tag_types WHERE name = '${this.sqlEscape(type.name)}'`)
                }, error => reject(error)).then(result => {
                    resolve();
                }, error => reject(error));
            }
        });
    }
    async deleteTag(tag: Tag) {
        return new Promise<void>((resolve, reject) => {
            new Promise<void[]>((resolve1, reject1) => {
                if (tag.children.length > 0) {
                    return this.getTags(tag.children).then(children => {
                        let deleted: Promise<void>[] = [];
                        for (let i = 0; i < children.length; i++) {
                            deleted.push(this.deleteTag(children[i]));
                        }
                        resolve1(Promise.all(deleted));
                    }, error => reject(error));
                } else {
                    resolve1(null);
                }
            }).then(() => {
                return tag.getParent(this);
            }).then(parent => {
                parent.removeChild(tag.name);
                return this.updateTag(parent);
            }, error => reject(error)).then(() => {
                return this.getItems(tag.refs);
            }).then(refs => {
                let refRemovals: Promise<void>[] = [];
                for (let i = 0; i < refs.length; i++) {
                    let item = refs[i];
                    if (item.tags.includes(tag.name)) {
                        item.tags.splice(item.tags.indexOf(tag.name), 1);
                        refRemovals.push(this.updateItem(item));
                    }
                }
                return Promise.all(refRemovals);
            }, error => reject(error)).then(() => {
                return this.client.query(`DELETE FROM tags WHERE name = '${this.sqlEscape(tag.name)}'`);
            }).then(result => resolve(), error => reject(error));
        });
    }
    async deleteItem(item: Item) {
        return new Promise<void>((resolve, reject) => {
            new Promise<void>((resolve1, reject1) => {
                if (item.filePath != '') {
                    fs.rm(item.filePath, (error) => {
                        if (error) {
                            console.log(`[Server:DB] Cleanup required (${item.filePath})`);
                            reject(error);
                        } else {
                            resolve1();
                        }
                    });
                } else {
                    resolve1();
                }
            }).then(() => {
                return this.changeTags(item.tags, [], item.id);
            }).then(() => {
                return this.client.query(`DELETE FROM items WHERE id = ${item.id}`);
            }).then(result => resolve(), error => reject(error));
        });
    }
    async deleteUser(user: User) {
        return new Promise<void>((resolve, reject) => {
            new Promise<void>((resolve1, reject1) => {
                if (user.role == Role.Admin) {
                    this.client.query(`SELECT COUNT(*) FROM users WHERE role = 2`).then(result => {
                        let count: number = +(<string>result.rows[0].count);
                        if (count <= 1) {
                            reject(new Error('There must be at least 1 admin account.'));
                        } else {
                            resolve1();
                        }
                    });
                } else {
                    resolve1();
                }
            }).then(() => {
                return this.client.query(`DELETE FROM users WHERE uname = '${this.sqlEscape(user.username)}'`);
            }).then(result => resolve(), error => reject(error));
        });

    }

    //other
    async reHost(tempFile: string, type: string, id: number): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let extension = type.split('/')[1];
            if (extension == 'svg+xml') {
                extension = 'svg';
            }
            let fileName = `${getRandomHexString(25)}_${id}.${extension}`;
            let newPath = path.join(__dirname, '..', 'public', 'img', fileName);
            fs.rename(tempFile, newPath, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([
                        `$BASE_URL/img/${fileName}`,
                        newPath
                    ]);
                }
            });
        });
    }
    async ensureAdmin() {
        return new Promise<void>((resolve, reject) => {
            this.client.query(`SELECT COUNT(*) FROM users WHERE role = 2`).then(result => {
                if (+(<string>result.rows[0].count) > 0) {
                    resolve();
                } else {
                    let admin: User = new User('admin', Role.Admin, User.getDefaultConfig());
                    admin.setPassword('', 'toor').then(() => {
                        return this.addUser(admin);
                    }, error => reject(error)).then(() => {
                        console.log(`[Server:DB] Default admin account created.  Change the password ASAP`)
                        resolve();
                    }, error => reject(error));
                }
            }, error => reject(error));
        });
    }

    private sqlEscape(unsafe: string): string {
        if (unsafe.includes("'")) {
            return unsafe.replace("'", '\u0006');
        } else {
            return unsafe;
        }
    }
    private sqlMultiEscape(unsafe: string[]): string[] {
        let safe: string[] = [];
        unsafe.forEach(str => {
            safe.push(this.sqlEscape(str));
        });
        return safe;
    }
    private sqlUnEscape(safe: string): string {
        if (safe.includes('\u0006')) {
            return safe.replace('\u0006', "'");
        } else {
            return safe;
        }
    }
}