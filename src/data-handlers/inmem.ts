import { TagType, Tag, Item, DataHandler, SearchOptions, SearchResults, User, getRandomString, Role, UserError, TagError, TagTypeError, ItemError } from "@rt/data";

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
        this.nextItem = this.nextUser = 0;
    }

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
        return 28
    }

    //listers
    async searchUsers(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<User>> {
        if(search == '') {
            let out = [...this.users.values()]
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        } else {
            let out: User[] = [];
            this.users.forEach((user, name) => {
                if(name.match(search)) {
                    out.push(user);
                }
            });
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        }
    }
    async searchTags(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<Tag>> {
        if(search == '') {
            let out = [...this.tags.values()]
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        } else {
            let out: Tag[] = [];
            this.tags.forEach((tag, name) => {
                if(name.match(search)) {
                    out.push(tag);
                }
            });
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        }
    }
    async searchTagTypes(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<TagType>> {
        if(search == '') {
            let out = [...this.tagTypes.values()];;
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        } else {
            let out: TagType[] = [];
            this.tagTypes.forEach((type, name) => {
                if(name.match(search)) {
                    out.push(type);
                }
            });
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        }
    }
    async searchItems(search: string, pageSize: number, pageNumber: number, user: User, options?: SearchOptions): Promise<SearchResults<Item>> {
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
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        } else {
            let errorString: string = '';
            await this.reduce(search).then(reduced => {
                this.getItems(reduced).forEach(item => {
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
            }, (error:TagError) => {
                errorString = error.message;
            });
            if(errorString != '') {
                throw new TagError(errorString);
            }
            if(pageSize <= 0) {
                return new SearchResults(out, out.length, 1);
            } else {
                return new SearchResults(
                    out.slice((pageNumber-1)*pageSize, (pageNumber-1)*pageSize + pageSize),
                    out.length,
                    (out.length - (out.length % pageSize)) / pageSize + (out.length % pageSize == 0 ? 0 : 1)
                );
            }
        }
    }

    //Queeries
    async getUser(userName: string): Promise<User> {
        let user: User = this.users.get(userName);;
        if(user == undefined) {
            throw new UserError(`${userName} not found.`);
        } else {
            return user;
        }
    }
    async getTag(name: string): Promise<Tag> {
        let tag: Tag = this.tags.get(name);;
        if(tag == undefined) {
            throw new TagError(`${name} not found.`);
        } else {
            return tag;
        }
    }
    async getTagType(name: string): Promise<TagType> {
        let type: TagType = this.tagTypes.get(name);;
        if(type == undefined) {
            throw new TagTypeError(`${name} not found.`);
        } else {
            return type;
        }
    }
    async getItem(id: number): Promise<Item> {
        let item: Item = this.items.get(id);;
        if(item == undefined) {
            throw new ItemError(`${id} not found.`);
        } else {
            return item;
        }
    }

    //Multi-Getters
    getUsers(userNames: string[]): User[] {
        let out: User[] = [];
        userNames.forEach(username => {
            out.push(this.users.get(username));
        });
        return out;
    }
    getTags(names: string[]): Tag[] {
        let out: Tag[] = [];
        let error: string = '';
        names.forEach(name => {
            if(this.tags.has(name)) {
                out.push(this.tags.get(name));
            } else {
                error = `Tag "${name}" not found.`;
                return;
            }
        });
        if(error != '') {
            return out;
        } else {
            throw new TagError(error);
        }
    }
    getTagTypes(names: string[]): TagType[] {
        let out: TagType[] = [];
        let error: string = '';
        names.forEach(name => {
            if(this.tagTypes.has(name)) {
                out.push(this.tagTypes.get(name));
            } else {
                error = `Tag Type "${name}" not found.`;
                return;
            }
        });
        if(error != '') {
            return out;
        } else {
            throw new TagTypeError(error);
        }
    }
    getItems(ids: number[]): Item[] {
        let out: Item[] = [];
        let error: string = '';
        ids.forEach(id => {
            if(this.items.has(id)) {
                out.push(this.items.get(id));
            } else {
                error = `Item "${id}" not found.`;
                return;
            }
        });
        if(error != '') {
            return out;
        } else {
            throw new ItemError(error);
        }
    }

    //Adders
    async addUser(user: User) {
        if(this.users.has(user.username)) {
            throw new UserError('User already exists.');
        } else {
            this.users.set(user.username, user);
        }
    }
    async addTag(tag: Tag) {
        if(this.tags.has(tag.name)) {
            throw new TagError('Tag already exists');
        } else {
            this.tags.set(tag.name, tag);
        }
    }
    async addTagType(type: TagType) {
        if(this.tagTypes.has(type.name)) {
            throw new TagTypeError('Tag Type already exists.');
        } else {
            this.tagTypes.set(type.name, type);
        }
    }
    async addItem(item: Item) {
        if(this.items.has(item.id)) {
            throw new ItemError('Item already exists');
        } else {
            this.items.set(item.id, item);
        }
    }

    //Updaters
    async updateUser(user: User) {
        let errorString: string = '';
        await this.getUser(user.username).then(old => {
            old.role = user.role;
            old.hash = user.hash;
            old.salt = user.salt;
            old.state = user.state;
        }, async (error:UserError) => {
            await this.addUser(user).then(() => {}, (error:UserError) => {errorString = error.message;});
        });
        if (errorString != '') {
            throw new UserError(`Unable to update user "${user.username}".\nThis was caused by: ${errorString}`);
        }
    }
    async updateTag(tag: Tag) {
        let errorString: string = '';
        await this.getTag(tag.name).then(old => {
            old.type = tag.type;
            old.parent = tag.parent;
        }, async (error:TagError) => {
            await this.addTag(tag).then(() => {}, (error:TagError) => {errorString = error.message;});
        });
        if (errorString != '') {
            throw new TagError(`Unable to update tag "${tag.name}".\nThis was caused by: ${errorString}`);
        }
    }
    async updateTagType(type: TagType) {
        let errorString: string = '';
        await this.getTagType(type.name).then(old => {
            old.color = type.color;
            old.order = type.order;
        }, async (error:TagTypeError) => {
            await this.addTagType(type).then(() => {}, (error:TagTypeError) => {errorString = error.message;});
        });
        if (errorString != '') {
            throw new TagTypeError(`Unable to update tag type "${type.name}".\nThis was caused by: ${errorString}`);
        }
    }
    async updateItem(item: Item, tags: string[]) {
        let errorString: string = '';
        await this.getItem(item.id).then(async old => {
            old.date = item.date;
            old.desc = item.desc;
            old.pub = item.pub;
            old.tagsChanged(this, tags);
        }, async (error:ItemError) => {
            await this.addItem(item).then(() => {}, (error:ItemError) => {errorString = error.message});
        });
        if (errorString != '') {
            throw new ItemError(`Unable to update item "${item.id}".\nThis was caused by: ${errorString}`);
        }
    }

    //Deleters
    async deleteUser(user: User) {
        if(user.role == Role.Admin) {
            let admins = 0;
            this.users.forEach(user => {
                if(user.role = Role.Admin) {
                    admins++;
                }
            });
            if(admins < 2) {
                throw new UserError('There must be at least one admin account.')
            }
        }
        this.users.delete(user.username);
    }
    async deleteTag(tag: Tag) {
        if(tag.children.length > 0) {
            this.getTags(tag.children).forEach(async childTag => {
                childTag.parent = null;
                await this.updateTag(childTag);
            });
        }
        this.getItems(tag.refs).forEach(async item => {
            let temp: string[] = item.tags.concat([]);
            temp.splice(temp.indexOf(tag.name), 1);
            await this.updateItem(item, temp);
        });
        if(tag.parent != null) {
            await tag.getParent(this).then(parent => {
                parent.removeChild(tag.name);
            });
        }
        this.tags.delete(tag.name);
    }
    async deleteTagType(type: TagType) {
        this.tags.forEach(tag => {
            if(tag.type == type.name) {
                tag.type = 'default';
            }
        });
        this.tagTypes.delete(type.name);
    }
    async deleteItem(item: Item) {
        this.getTags(item.tags).forEach(tag => {
            tag.removeRef(item.id);
        });
        this.items.delete(item.id);
    }
}