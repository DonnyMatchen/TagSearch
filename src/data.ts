import argon2 from "argon2";
import { randomBytes } from 'crypto';
import { Buffer } from 'buffer';

class Diff {
    added: string[] = [];
    removed: string[] = [];
}

export class TagType {
    readonly name: string;
    color: string;
    order: number;

    constructor(name: string, color: string, order: number) {
        this.name = name;
        this.color = color;
        this.order = order;
    }
}

export class Tag {
    readonly name: string;
    type: string;
    parent: string;
    children: string[];
    readonly refs: number[];

    constructor(name: string, type: TagType, parent?: Tag, refs?: number[]) {
        this.name = name;
        if(parent != undefined) {
            this.parent = parent.name;
            this.type = parent.type;
            parent.addChild(name);
        } else {
            this.parent = null;
            this.type = type.name;
        }
        this.children = [];
        if(refs == undefined) {
            refs = [];
        }
        this.refs = refs;
    }

    async getParent(dataHandler: DataHandler): Promise<Tag> {
        return dataHandler.getTag(this.parent);
    }

    async getChildren(dataHandler: DataHandler): Promise<Tag[]> {
        return dataHandler.getTags(this.children);
    }

    addRef(ref: number) {
        if(!this.refs.includes(ref)) {
            this.refs.push(ref);
        }
    }
    removeRef(ref: number) {
        if(this.refs.includes(ref)) {
            this.refs.splice(this.refs.indexOf(ref), 1);
        }
    }

    addChild(child: string) {
        if(!this.children.includes(child)) {
            this.children.push(child);
        }
    }
    removeChild(child: string) {
        if(this.children.includes(child)) {
            this.children.splice(this.children.indexOf(child), 1);
        }
    }

    async getProximity(dataHandler: DataHandler): Promise<number> {
        let out: number = 0;
        if(this.parent == null) {
            return out;
        } else {
            await this.getParent(dataHandler).then(async parent => {
                await parent.getProximity(dataHandler).then(prox => {
                    out = prox + 1;
                });
            });
            return out;
        }
    }
}

class ItemOptions {
    desc?: string;
    pub?: boolean;
}

export enum ItemType {
    Image = 0,
    Document = 1
}

export class Item {
    readonly id: number;
    source: string;
    date: number;
    readonly tags: string[];
    desc: string;
    type: ItemType;
    pub: boolean;

    constructor(dataHandler: DataHandler, id: number, source: string, date: number, type: ItemType, options?: ItemOptions) {
        this.id = id;
        this.source = source;
        this.date = date;
        this.type = type;
        this.tags = [];
        this.pub = false;
        if(options != undefined) {
            if(options.pub != undefined) {
                this.pub = options.pub;
            }
            if (options.desc == undefined || options.desc == null) {
                options.desc = '';
            }
            this.desc = options.desc;
        } else {
            this.desc = '';
        }
    }

    /**
     * ONLY USE THIS FUNCTION TO ALTER THE TAGS LIST!
     * @param newList the new list of tags
     */
    async tagsChanged(dataHandler: DataHandler, newList: string[]) {
        let error: Error = null;
        await this.expandTags(dataHandler, newList).then(async expanded => {
            let changes: Diff = this.diffTags(this.tags, expanded);
            for(let i = 0; i < changes.removed.length; i++) {
                let tagName: string = changes.removed[i];
                await dataHandler.getTag(tagName).then(tag => {
                    tag.removeRef(this.id);
                    dataHandler.updateTag(tag);
                }, err => {
                    error = err;
                });
            }
            if(error == null) {
                for(let i = 0; i < changes.added.length; i++) {
                    let tag = changes.added[i];
                    let foundTag: Tag;
                    await dataHandler.getTag(tag).then(found => {
                        foundTag = found;
                    }, async (error:Error) => {
                        await dataHandler.getTagType('default').then(async type => {
                            foundTag = new Tag(tag, type);
                            await dataHandler.addTag(foundTag);
                        });
                    }).finally(() => {
                        foundTag.addRef(this.id);
                        dataHandler.updateTag(foundTag);
                    });
                }
                this.tags.splice(0, this.tags.length);
                expanded.forEach(tag => this.tags.push(tag));
            }
        }, err => {
            error = err;
        });
        if(error != null) {
            throw error;
        }
    }

    private async expandTags(dataHandler: DataHandler, list: string[]) {
        let out: string[] = [];
        for(let i = 0; i < list.length; i++) {
            let tagName = list[i];
            let wrong: boolean = false;
            await dataHandler.getTag(tagName).then(async tag => {
                if(!out.includes(tag.name)) {
                    out.push(tag.name);
                }
                let parent = tag.parent;
                while(parent != null) {
                    await dataHandler.getTag(parent).then(tag => {
                        if(!out.includes(tag.name)) {
                            out.push(tag.name);
                        }
                        parent = tag.parent;
                    });
                }
            }, error => {
                wrong = true;
            });
            if(wrong) {
                throw new Error(tagName);
            }
        }
        return out;
    }

    /**
     * 
     * @param oldList the original list
     * @param newList the replacement list
     * @returns a Diff object that contains a list of added and removed elements
     */
    private diffTags(oldList: string[], newList: string[]): Diff {
        let changes: Diff = new Diff();
        oldList.forEach(tag => {
            if(!newList.includes(tag)) {
                changes.removed.push(tag);
            }
        });
        newList.forEach(newTag => {
            let contains: boolean = false;
            oldList.forEach(oldTag => {
                if(oldTag == newTag) {
                    contains = true;
                    return;
                }
            });
            if(!contains) {
                changes.added.push(newTag)
            }
        });
        return changes;
    }
}

export enum Role {
    Normal = 0,
    Family = 1,
    Admin = 2
}

export function roleToString(role: Role): string {
    switch(role) {
        case(Role.Normal): return 'Normal';
        case(Role.Family): return 'Family';
        case(Role.Admin): return 'Admin';
    }
}
export function roleFromString(str: string): Role {
    switch(str) {
        case('Normal'): return Role.Normal;
        case('Family'): return Role.Family;
        case('Admin'): return Role.Admin;
    }
}

export enum UserState {
    New,
    Set,
    Error
}

export class User {
    state: UserState;

    readonly username: string;
    hash: string;
    salt: string;
    role: Role;

    constructor(username: string, role: Role | string, options?: {hash: string, salt: string}) {
        this.username = username;
        if(typeof role == 'string') {
            this.role = roleFromString(role);
        } else {
            this.role = role;
        }
        if(options != undefined) {
            this.hash = options.hash;
            this.salt = options.salt;
            this.state = UserState.Set;
        } else {
            this.state = UserState.New;
            this.salt = getRandomString(15);
        }
    }

    async check(test: string): Promise<boolean> {
        return argon2.verify(this.hash, test + this.salt);
    }

    async setPassword(oldPassword: string, newPassword: string) {
        let change: boolean = false;
        if(this.state != UserState.Set) {
            change = true;
        } else {
            if(this.check(oldPassword)) {
                change = true;
            }
        }
        if(change) {
            let newSalt: string = getRandomString(15);
            let err:Error = null;
            await argon2.hash(newPassword + newSalt).then(hash => {
                this.hash = hash;
                this.state = UserState.Set;
                this.salt = newSalt;
            }, (error:Error) => {
                this.state = UserState.Error;
                err = error;
            });
            if(err != null) {
                throw err;
            }
        } else {
            throw new Error('Verification failed');
        }
    }

    roleToString() {
        return roleToString(this.role);
    }

    stateToString() {
        switch(this.state) {
            case(UserState.New): return 'Password Not Set';
            case(UserState.Set): return 'Password Set'
            case(UserState.Error): return 'Error Setting Password'
        }
    }
}

export class SearchOptions {
    before?: number;
    after?: number;
}

export class SearchResults<E> {
    results: E[];
    pageLength: number;
    total: number;
    page: number;
    pageCount: number;

    constructor(results: E[], total: number, page: number, pageCount: number) {
        this.results = results;
        this.pageLength = results.length;
        this.total = total;
        this.page = page;
        this.pageCount = pageCount;
    }
}

export abstract class DataHandler {
    /**
     * 
     * @returns the next avaiable item ID
     */
    abstract nextItemID(): Promise<number>;

    /**
     * 
     * @returns a new random session ID
     */
    abstract generateSessionID(): string;

    /**
     * This value should be static, used as the defaullt when no user-specified value is provided for page size
     * @returns the number of items per search page
     */
    abstract getPageLimit(): number;

    /**
     * 
     * @param search the search string used to filter users
     * @param pageSize the number of items per page
     * @param pageNumber the page number to return
     * @returns a list of users that match the search string
     */
    abstract searchUsers(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<User>>;
    /**
     * 
     * @param search the search string used to filter tags
     * @param pageSize the number of items per page
     * @param pageNumber the page number to return
     * @returns a list of tags that match the search string
     */
    abstract searchTags(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<Tag>>;
    /**
     * 
     * @param search the search string used to filter tag types
     * @param pageSize the number of items per page
     * @param pageNumber the page number to return
     * @returns a list of tag types that match the search string
     */
    abstract searchTagTypes(search: string, pageSize: number, pageNumber: number): Promise<SearchResults<TagType>>;
    /**
     * 
     * @param search the search string used to filter items
     * @param pageSize the number of items per page
     * @param pageNumber the page number to return
     * @param options options to narrow the search
     * @returns a list of items that match the search string and come before the timestamp
     */
    abstract searchItems(search: string, pageSize: number, pageNumber: number, user: User, options?: SearchOptions): Promise<SearchResults<Item>>;

    /**
     * 
     * @param name username of the user
     * @returns the specific user by their exact username, or undefined if it does not exist
     */
    abstract getUser(userName: string): Promise<User>;
    /**
     * 
     * @param name name of the tag
     * @returns the specific tag by it's exact name, or undefined if it does not exist
     */
    abstract getTag(name: string): Promise<Tag>;
    /**
     * 
     * @param name name of the tag type
     * @returns the specific tag type by it's exact name, or undefined if it does not exist
     */
    abstract getTagType(name: string): Promise<TagType>;
    /**
     * 
     * @param id unique id of the item
     * @returns the specific item by it's exact name, or undefined if it does not exist
     */
    abstract getItem(id: number): Promise<Item>;

    /**
     * This does not garentee that contents will be in the same order.
     * 
     * @param usernames an array of usernames
     * @returns an array of users
     */
    abstract getUsers(usernames: string[]): Promise<User[]>;
    /**
     * This does not garentee that contents will be in the same order.
     * 
     * @param names an array of tag names
     * @returns an array of tags
     */
    abstract getTags(names: string[]): Promise<Tag[]>;
    /**
     * This does not garentee that contents will be in the same order.
     * 
     * @param names an array of tag type names
     * @returns an array of tag types
     */
    abstract getTagTypes(names: string[]): Promise<TagType[]>;
    /**
     * This does not garentee that contents will be in the same order.
     * 
     * @param names an array of item ids
     * @returns an array of items
     */
    abstract getItems(ids: number[]): Promise<Item[]>;

    /**
     * If the user's username is already present, the promise is rejected.
     * @param user the user to add to the database
     */
    abstract addUser(user: User): Promise<void>;
    /**
     * If the tag's name is already present, the promise is rejected.
     * @param tag the tag to add to the database
     */
    abstract addTag(tag: Tag): Promise<void>;
    /**
     * If the tag type's name is already present, the promise is rejected.
     * @param type the tag type to add to the database
     */
    abstract addTagType(type: TagType): Promise<void>;
    /**
     * If the item's id is already present, the promise is rejected.
     * @param item the item to add to the database
     */
    abstract addItem(item: Item): Promise<void>;

    /**
     * If the user doesn't exist, it is added instead.
     * @param user the new user to replace the old
     */
    abstract updateUser(user: User): Promise<void>;
    /**
     * If the tag doesn't exist, it is added instead.
     * @param tag the new tag to replace the old
     */
    abstract updateTag(tag: Tag): Promise<void>;
    /**
     * If the tag type doesn't exist, it is added instead.
     * @param type the new tag type to replace the old
     */
    abstract updateTagType(type: TagType): Promise<void>;
    /**
     * If the item doesn't exist, it is added instead.
     * @param item the new item to replace the old
     * @param tags the new tags to be added to the item
     */
    abstract updateItem(item: Item, tags: string[]): Promise<void>;

    /**
     * 
     * @param user the user to be deleted
     */
    abstract deleteUser(user: User): Promise<void>;
    /**
     * 
     * @param tag the tag to be deleted
     */
    abstract deleteTag(tag: Tag): Promise<void>;
    /**
     * 
     * @param type the tag type to be deleted
     */
    abstract deleteTagType(type: TagType): Promise<void>;
    /**
     * 
     * @param item the item to be deleted
     */
    abstract deleteItem(item: Item): Promise<void>;

    /**
     * 
     * @param rawString a raw string of tags
     * @returns an array of tag names
     */
    tagsFromString(rawString: string): string[] {
        let arr: string[] = rawString.split(' ');
        let out: string[] = [];
        arr.forEach(value => {
            if(!out.includes(value)) {
                out.push(value);
            }
        });
        out.sort();
        return out;
    }

    /**
     * 
     * @param tags an array of tag names
     * @param url a flag indicating if the string is for a url
     * @returns a string of tags for a url or searchbar
     */
    protected tagsToString(tags: string[], url: boolean): string {
        if (tags.length == 0) {
            return "";
        } else {
            return tags.join(url ? "+" : " ");
        }
    }

    /**
     * 
     * @param input raw input string
     * @returns the list of refs that share all tags in the tag string
     */
    async reduce(input: string): Promise<number[]> {
        let container: number[][] = [];
        let allRefs: number[] = [];
        let reduced: number[] = [];
        let tags: string[] = this.tagsFromString(input);
        if(tags.length < 2) {
            if(tags.length == 1) {
                let error: Error = null;
                await this.getTag(tags[0]).then(found => {
                    reduced = found.refs;
                }, (error:Error) => {
                    error = new Error(`Tag "${tags[0]}" not found.`);
                });
                if(error != null) {
                    throw error;
                }
            }
        } else {
            await this.getTags(tags).then(tags => {
                for(let i = 0; i < tags.length; i++) {
                    let found = tags[i];
                    let refList: number[] = found.refs;
                    container.push(refList);
                    refList.forEach(ref => {
                        if(!allRefs.includes(ref)) {
                            allRefs.push(ref);
                        }
                    });
                }
            });
            allRefs.forEach(ref => {
                let include = true;
                for(let i = 0; i < container.length; i++) {
                    if(!container[i].includes(ref)) {
                        include = false;
                        break;
                    }
                }
                if (include) {
                    reduced.push(ref);
                }
            });
        }
        return reduced;
    }

    async ensureAdmin() {
        let foundAdmin: boolean = false;
        await this.searchUsers('', -1, 1).then(results => {
            for(let i = 0; i < results.results.length; i++) {
                let user = results.results[i];
                if(user.role == Role.Admin) {
                    foundAdmin = true;
                    break;
                }
            }
        });
        if(!foundAdmin) {
            let admin: User = new User('admin', Role.Admin);
            admin.setPassword('', 'toor').then(() => {
                this.addUser(admin);
                console.log(`[server]: Default admin account created.  Change the password ASAP`);
            });
        }
    }

    /**
     * 
     * @param tempFile file path to the temp file
     * @param type the mime type of the file
     * @returns the permanent file path after rehosting
     */
    abstract reHost(tempFile: string, type: string): Promise<string>;
}

export default class Data {
    static async init(handler: DataHandler) {
        let def: TagType = new TagType('default', '#f0f0f0', 10);
        let sub: TagType = new TagType('Subjects', '#20f020', 0);
        let cont: TagType = new TagType('Context', '#20f0f0', 1);
        let desc: TagType = new TagType('Descriptions', '#f0f020', 2);
        handler.addTagType(def);
        handler.addTagType(sub);
        handler.addTagType(cont);
        handler.addTagType(desc);

        let x: Tag = new Tag('x', cont);
        let y: Tag = new Tag('y', sub);
        let z: Tag = new Tag('z', desc);
        let zz: Tag = new Tag('zz', null, z);
        handler.addTag(x);
        handler.addTag(new Tag('xx', null, x));
        handler.addTag(y);
        handler.addTag(new Tag('yy', null, y));
        handler.addTag(z);
        handler.addTag(zz);
        handler.addTag(new Tag('zzz', null, zz));
        
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/a6/78/__scp_foundation_drawn_by_langbazi__sample-a6788af625a75e6a01cf24170853c751.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'A corner of a room',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['xx']);
            });
        });
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/e1/6d/__ashen_one_dark_souls_and_1_more_drawn_by_conor_burke__sample-e16dd89ec5c0e2210dae609a58be8c04.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'A brave but foolish knight, fallen to flame and blood',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['yy']);
            });
        });
        
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/88/17/__slave_knight_gael_dark_souls_and_1_more_drawn_by_junjiuk__sample-88172e085d8be0193ee3ced013b26ed1.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'He is forgotten',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['zzz']);
            });
        });
        
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/c9/5f/__hunter_and_micolash_host_of_the_nightmare_bloodborne_drawn_by_rashuu__sample-c95fbd43765275557e0a57e852cea958.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'climb the stairs, you\'ve coem this far'
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['x', 'yy']);
            });
        });
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d8/67/__original_drawn_by_wayukako__sample-d8671b5e581753bf8dde6b7ed762afb4.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'Ever upward'
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['xx', 'z']);
            });
        });
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d7/e8/__original_drawn_by_ashsadila__sample-d7e8c53ac85d834a342c7b752242f258.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'No more fighting... please...',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['y', 'zz']);
            });
        });
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d7/e1/__girls_frontline__sample-d7e1d1b35bd30d7794469680cc72e45c.jpg',
                1733066171000,
                ItemType.Image,
                {
                    desc: 'Infinity awaits',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['xx', 'yy', 'zzz']);
            });
        });
        await handler.nextItemID().then(async id => {
            let item = new Item(
                handler,
                id,
                'https://www.bankersonline.com/sites/default/files/tools/99INVPOL.pdf',
                1733066171000,
                ItemType.Document,
                {
                    desc: 'A document!  A document!',
                    pub: true
                }
            );
            await handler.addItem(item).then(async () => {
                await item.tagsChanged(handler, ['xx', 'yy', 'zzz']);
            });
        });
    }
}

/**
 * a byte array of size `size * 5` is generated, then encoded into base64
 * this results in an output string of length `size * 8`
 * @param size the size of the string in increments of 8 characters
 * @returns a base64 encoded byte array, ensuring that random string is alphanumeric.
 */
export function getRandomString(size: number): string {
    return Buffer.from(Array.from(randomBytes(size * 5))).toString('base64');
}