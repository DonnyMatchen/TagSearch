import fs from 'fs';
import {createHash} from 'crypto';
import path from "path";

import { TagType, Tag, Item, DataHandler, SearchOptions, SearchResults, User, getRandomString, Role, ItemType } from "@rt/data";
import { Arguments } from '@utl/getArguments';

export default class InMem extends DataHandler {
    //InMem data-stores
    private users: Map<string, User>
    private tagTypes: Map<string, TagType>;
    private tags: Map<string, Tag>;
    private items: Map<number, Item>;
    private nextItem: number;
    private nextUser: number;

    constructor() {
        super();
        this.users = new Map();
        this.tagTypes = new Map();
        this.tags = new Map();
        this.items = new Map();
        this.nextItem = this.nextUser = 1;
    }

    async init() {}

    async nextItemID(): Promise<number> {
        return this.nextItem++;
    }
    nextUserID(): number {
        return this.nextUser++;
    }

    generateSessionID(): string {
        return getRandomString(30);
    }

    getPageLimit(): number {
        return 30
    }

    //listers
    async searchUsers(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<User>> {
        return new Promise((resolve, reject) => {
            if(search == '') {
                let out = [...this.users.values()]
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            } else {
                let out: User[] = [];
                this.users.forEach((user, name) => {
                    if(name.match(search)) {
                        out.push(user);
                    }
                });
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            }
        });
    }
    async searchTags(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<Tag>> {
        return new Promise((resolve, reject) => {
            if(search == '') {
                let out = [...this.tags.values()]
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            } else {
                let out: Tag[] = [];
                this.tags.forEach((tag, name) => {
                    if(name.match(search)) {
                        out.push(tag);
                    }
                });
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            }
        });
    }
    async searchTagTypes(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<TagType>> {
        return new Promise((resolve, reject) => {
            if(search == '') {
                let out = [...this.tagTypes.values()];;
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            } else {
                let out: TagType[] = [];
                this.tagTypes.forEach((type, name) => {
                    if(name.match(search)) {
                        out.push(type);
                    }
                });
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            }
        });
    }
    async searchItems(search: string, pageSize: number, pageNumber: number, user: User, options?: SearchOptions): Promise<SearchResults<Item>> {
        return new Promise((resolve, reject) => {
            let out: Item[] = [];
            if(search == '') {
                this.items.forEach(item => {
                    let add: boolean = item.pub || user != undefined && user.role >= 1;
                    if(add && options != undefined && options.before != undefined) {
                        add = item.date <= options.before;
                    }
                    if(add && options != undefined && options.after != undefined) {
                        add = item.date >= options.after
                    }
                    if(add) {
                        out.push(item);
                    }
                });
                if(pageSize <= 0) {
                    resolve(new SearchResults(out, out.length, 1, 1));
                } else {
                    resolve(new SearchResults(
                        out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                        out.length,
                        pageNumber,
                        (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                    ));
                }
            } else {
                this.reduce(search).then(reduced => this.getItems(reduced), (error:Error) => {
                    reject(new Error(error.message));
                }).then(items => {
                    if(items) {
                        for(let i = 0; i < items.length; i++) {
                            let item = items[i];
                            let add: boolean = item.pub || user != undefined && user.role >= 1;
                            if(add && options != undefined && options.before != undefined) {
                                add = item.date <= options.before;
                            }
                            if(add && options != undefined && options.after != undefined) {
                                add = item.date >= options.after
                            }
                            if(add) {
                                out.push(item);
                            }
                        }
                    }
                    if(pageSize <= 0) {
                        resolve(new SearchResults(out, out.length, 1, 1));
                    } else {
                        resolve(new SearchResults(
                            out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                            out.length,
                            pageNumber,
                            (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                        ));
                    }
                }, (error:Error) => {
                    reject(new Error(error.message));
                });
            }
        });
    }

    //Queeries
    async getUser(userName: string): Promise<User> {
        return new Promise((resolve, reject) => resolve(this.users.get(userName)));
    }
    async getTag(name: string): Promise<Tag> {
        return new Promise((resolve, reject) => resolve(this.tags.get(name)));
    }
    async getTagType(name: string): Promise<TagType> {
        return new Promise((resolve, reject) => resolve(this.tagTypes.get(name)));
    }
    async getItem(id: number): Promise<Item> {
        return new Promise((resolve, reject) => resolve(this.items.get(id)));
    }

    //Multi-Getters
    async getUsers(usernames: string[]): Promise<User[]> {
        return new Promise((resolve, reject) => {
            let out: User[] = [];
            usernames.forEach(username => {
                if(this.users.has(username)) {
                    out.push(this.users.get(username));
                } else {
                    reject(new Error(`User "${username}" not found.`));
                }
            });
            resolve(out);
        });
    }
    async getTags(names: string[]): Promise<Tag[]> {
        return new Promise((resolve, reject) => {
            let out: Tag[] = [];
            names.forEach(name => {
                if(this.tags.has(name)) {
                    out.push(this.tags.get(name));
                } else {
                    reject(new Error(`Tag "${name}" not found.`));
                }
            });
            resolve(out);
        });
    }
    async getTagTypes(names: string[]): Promise<TagType[]> {
        return new Promise((resolve, reject) => {
            let out: TagType[] = [];
            names.forEach(name => {
                if(this.tagTypes.has(name)) {
                    out.push(this.tagTypes.get(name));
                } else {
                    reject(new Error(`Tag Type "${name}" not found.`));
                }
            });
            resolve(out);
        });
    }
    async getItems(ids: number[]): Promise<Item[]> {
        return new Promise((resolve, reject) => {
            let out: Item[] = [];
            ids.forEach(id => {
                if(this.items.has(id)) {
                    out.push(this.items.get(id));
                } else {
                    reject(new Error(`Item "${id}" not found.`));
                }
            });
            resolve(out);
        });
    }

    //Adders
    async addUser(user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            if(this.users.has(user.username)) {
                reject(new Error('User already exists.'));
            } else {
                this.users.set(user.username, user);
                resolve();
            }
        });
    }
    async addTag(tag: Tag): Promise<void> {
        return new Promise((resolve, reject) => {
            if(this.tags.has(tag.name)) {
                reject(new Error('Tag already exists'));
            } else {
                let parent: Tag;
                new Promise<void>((resolve1, reject1) => {
                    if(tag.parent != '') {
                        this.getTag(tag.parent).then(prnt => {
                            if(prnt) {
                                parent = prnt;
                                prnt.addChild(tag.name);
                                resolve1(this.updateTag(prnt));
                            }
                        })
                    } else {
                        resolve1();
                    }
                }).then(() => {
                    tag.type = parent ? parent.type : tag.type;
                    this.tags.set(tag.name, tag);
                    resolve();
                }, error => reject(error));
            }
        });
    }
    async addTagType(type: TagType): Promise<void> {
        return new Promise((resolve, reject) => {
            if(this.tagTypes.has(type.name)) {
                reject(new Error('Tag Type already exists'));
            } else {
                this.tagTypes.set(type.name, type);
                resolve();
            }
        });
    }
    async addItem(item: Item): Promise<void>  {
        return new Promise((resolve, reject) => {
            if(this.items.has(item.id)) {
                reject(new Error('Item already exists'));
            } else {
                this.changeTags([], item.tags, item.id).then(() => {
                    this.items.set(item.id, item);
                    resolve();
                });
            }
        });
    }

    //Updaters
    async updateUser(user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            this.users.set(user.username, user);
            resolve();
        });
    }
    async updateTag(tag: Tag): Promise<void> {
        return new Promise((resolve, reject) => {
            this.getTag(tag.name).then(old => {
                if(!old) {
                    resolve(this.addTag(tag));
                } else {
                    new Promise<void>((resolve1, reject1) => {
                        if(old.parent != tag.parent && old.parent != '') {
                            this.getTag(old.parent).then(oldParent => {
                                oldParent.removeChild(old.name);
                                resolve1(this.updateTag(oldParent));
                            });
                        } else {
                            resolve1();
                        }
                    }).then(() => {
                        return new Promise<void>((resolve1, reject1) => {
                            if(old.parent != tag.parent && tag.parent != '') {
                                this.getTag(tag.parent).then(newParent => {
                                    newParent.addChild(tag.name);
                                    resolve1(this.updateTag(newParent));
                                });
                            } else {
                                resolve1();
                            }
                        });
                    }).then(() => {
                        this.tags.set(tag.name, tag);
                        resolve();
                    });
                }
            });
        });
    }
    async updateTagType(type: TagType): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tagTypes.set(type.name, type);
            resolve();
        });
    }
    async updateItem(item: Item, tags: string[]): Promise<void> {
        new Promise<void>((resolve, reject) => {
            this.getItem(item.id).then(old => {
                if(old) {
                    this.changeTags(old.tags, item.tags, item.id).then(() => {
                        return new Promise<void>((resolve1, reject1) => {
                            if(old.filePath != item.filePath && old.filePath != '') {
                                fs.rm(old.filePath, (error) => {
                                    if(error) {
                                        console.log(`[Server:InMem] Cleanup required (${old.filePath})`);
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
                        this.items.set(item.id, item);
                        resolve();
                    });
                } else {
                    resolve(this.addItem(item));
                }
            });
        });
    }

    //Deleters
    async deleteUser(user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            if(user.role == Role.Admin) {
                let admins = 0;
                this.users.forEach(user => {
                    if(user.role = Role.Admin) {
                        admins++;
                    }
                });
                if(admins < 2) {
                    reject(new Error('There must be at least one admin account.'));
                }
            }
            if(this.users.delete(user.username)) {
                resolve();
            } else {
                reject(new Error('The user was not deleted.'));
            }
        });
    }
    async deleteTag(tag: Tag): Promise<void> {
        return new Promise((resolve, reject) => {
            new Promise<void>((resolve1, reject1) => {
                if(tag.children.length > 0) {
                    resolve1(this.getTags(tag.children).then(async tags => {
                        for(let i = 0; i < tags.length; i++) {
                            let childTag = tags[i];
                            childTag.parent = '';
                            await this.updateTag(childTag);
                        }
                    }));
                } else {
                    resolve1();
                }
            }).then(() => {
                return this.getItems(tag.refs).then(async items => {
                    for(let i = 0; i < items.length; i++) {
                        let item = items[i];
                        let temp: string[] = item.tags.concat([]);
                        temp.splice(temp.indexOf(tag.name), 1);
                        await this.updateItem(item, temp);
                    }
                });
            }).then(() => {
                if(tag.parent != undefined) {
                    return tag.getParent(this);
                } else {
                    return undefined;
                }
            }).then(parent => {
                if(parent) {
                    parent.removeChild(tag.name);
                }
                if(this.tags.delete(tag.name)) {
                    resolve();
                } else {
                    reject(new Error('The tag was not deleted.'));
                }
            });
        });
    }
    async deleteTagType(type: TagType): Promise<void> {
        return new Promise((resolve, reject) => {
            this.searchTags('', -1, 1).then(async results => {
                for(let i =0; i < results.results.length; i++) {
                    let tag = results.results[i];
                    if(tag.type == type.name) {
                        tag.type = 'default';
                        await this.updateTag(tag);
                    }
                }
            }).then(() => {
                if(this.tagTypes.delete(type.name)) {
                    resolve();
                } else {
                    reject(new Error('The tag type was not deleted.'));
                }
            });
        });
    }
    async deleteItem(item: Item): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            new Promise<void>((resolve1, reject1) => {
                if(item.filePath != '') {
                    fs.rm(item.filePath, (error) => {
                        if(error) {
                            console.log(`[Server:InMem] Cleanup required (${item.filePath})`);
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
                this.items.delete(item.id);
                resolve();
            });
        });
    }

    async reHost(tempFile: string, type: string, id: number): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fs.readFile(tempFile, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    let extension = type.split('/')[1];
                    if(extension == 'svg+xml') {
                        extension = 'svg';
                    }
                    let fileName = `${createHash('sha-256').update(data).digest('hex')}_${id}.${extension}`;
                    let newPath = path.join(__dirname, '..', 'public', 'img', fileName);
                    fs.writeFile(newPath, data, (error) => {
                        if(error) {
                            reject(error);
                        } else {
                            fs.rm(tempFile, (error) => {
                                if(error) {
                                    console.log(`[Server:DB] Cleanup required (${tempFile})`);
                                }
                            });
                            resolve([
                                `${Arguments.url}/img/${fileName}`,
                                newPath
                            ]);
                        }
                    });
                }
            });
        });
    }
}