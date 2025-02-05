import argon2 from "argon2";
import { randomBytes } from 'crypto';
import { Buffer } from 'buffer';
import { ColorConv, formColor, HslColor, Hue, Lum } from "@utl/appColor";

class Diff {
    added: string[] = [];
    removed: string[] = [];
}

export class TagType {
    readonly name: string;
    color: ColorConv;
    order: number;

    constructor(name: string, color: string, order: number) {
        this.name = name;
        this.color = new ColorConv(color);
        this.order = order;
    }

    getColor(lum: Lum): HslColor {
        return this.color.getHSL(lum);
    }
    getColorString(lum: Lum): string {
        let color = this.getColor(lum);
        return `HSL(${color.h}, ${color.s}%, ${color.l}%)`
    }
}

export class Tag {
    readonly name: string;
    type: string;
    parent: string;
    children: string[];
    readonly refs: number[];

    constructor(name: string, type: string, parent?: string, refs?: string[], children?: string[]) {
        this.name = name;
        this.parent = '';
        if(parent) {
            this.parent = parent;
        }
        this.type = type;
        this.children = [];
        if(children) {
            children.forEach(str => {
                this.children.push(str);
            });
        }
        this.refs = [];
        if(refs) {
            refs.forEach(str => {
                this.refs.push(+str);
            });
        }
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
        if(this.parent == '') {
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

    constructor(id: number, source: string, date: number, type: ItemType, pub: boolean, desc?: string, tags?: string[]) {
        this.id = id;
        this.source = source;
        this.date = date;
        this.type = type;
        this.tags = [];
        this.pub = pub;
        this.desc = desc;
        if(!this.desc) {
            this.desc = '';
        }
        if(tags) {
            tags.forEach(tag => {
                this.tags.push(tag);
            });
        }
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
    New = 0,
    Set = 1,
    Error = -1
}

export class User {
    static getDefaultConfig(): PersonalConfig {
        return {
            tagLum: Lum.bright,
            bg: new HslColor(0, 0, 20),
            fg: new HslColor(0, 0, 90),
            msg: new HslColor(0, 0, 30),
            header: new HslColor(0, 0, 10),
            theme: formColor(Hue.teal, Lum.dark),
            bad: formColor(Hue.red, Lum.dark),
            good: formColor(Hue.green, Lum.dark)
        };
    }

    state: UserState;

    readonly username: string;
    hash: string;
    salt: string;
    role: Role;
    config: PersonalConfig;

    constructor(username: string, role: Role, config: string | PersonalConfig, hash?: string, salt?: string) {
        this.username = username;
        if(typeof config == 'string') {
            this.config = new PersonalConfig(config);
        } else {
            this.config = config;
        }
        this.role = role;
        if(hash && salt) {
            this.hash = hash;
            this.salt = salt;
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

export class PersonalConfig {
    tagLum: Lum;
    bg: HslColor;
    fg: HslColor;
    header: HslColor;
    msg: HslColor;
    theme: HslColor;
    bad: HslColor;
    good: HslColor;

    constructor(raw: string) {
        let rawObj: any = JSON.parse(raw);
        this.tagLum = rawObj.tagLum;
        this.bg = new HslColor(rawObj.bg.h, rawObj.bg.s, rawObj.bg.l);
        this.fg = new HslColor(rawObj.fg.h, rawObj.fg.s, rawObj.fg.l);
        this.header = new HslColor(rawObj.header.h, rawObj.header.s, rawObj.header.l);
        this.msg = new HslColor(rawObj.msg.h, rawObj.msg.s, rawObj.msg.l);
        this.theme = new HslColor(rawObj.theme.h, rawObj.theme.s, rawObj.theme.l);
        this.bad = new HslColor(rawObj.bad.h, rawObj.bad.s, rawObj.bad.l);
        this.good = new HslColor(rawObj.good.h, rawObj.good.s, rawObj.good.l);
    }
}

export abstract class DataHandler {
    /**
     * This is for initializing data connections
     */
    abstract init(): Promise<void>;

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
            let admin: User = new User('admin', Role.Admin, User.getDefaultConfig());
            admin.setPassword('', 'toor').then(() => {
                return this.addUser(admin);
            }).then(() => console.log(`[Server:Data] Default admin account created.  Change the password ASAP`));
        }
    }
    async ensureDefaultType() {
        return new Promise<void>((resolve, reject) => {
            this.getTagType('default').then(type => {
                if(type) {
                    resolve();
                } else {
                    this.addTagType(new TagType('default', 'Grayscale:90', 100)).then(() => {
                        resolve();
                    }, error => reject(error));
                }
            }, error => reject(error));
        });
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

    private mergeTags(oldList: string[], newList: string[]): string[] {
        let out = [...oldList];
        newList.forEach(tagName => {
            if(!out.includes(tagName)) {
                out.push(tagName);
            }
        });
        return out;
    }

    private async addParents(newList: string[], diffAdded: String[], fetched: Map<string, Tag>, tag: Tag): Promise<void> {
        return new Promise((resolve, reject) => {
            if(tag.parent != '' && !fetched.has(tag.parent)) {
                this.getTag(tag.parent).then(parent => {
                    newList.push(parent.name);
                    diffAdded.push(parent.name);
                    fetched.set(parent.name, parent);
                    resolve(this.addParents(newList, diffAdded, fetched, parent));
                }, error => reject(error));
            } else {
                resolve();
            }
        });
    }

    /**
     * This is a utility function for handling the updating of tags with changes to an item
     * @param oldList the old list of tags
     * @param newList the new list of tags
     * @param ref the reference id for the item that is changing tags
     */
    protected async changeTags(oldList: string[], newList: string[], ref: number) {
        //diff
        let diff = this.diffTags(oldList, newList);
        let merge = this.mergeTags(oldList, newList);

        return new Promise<void>((resolve, reject) => {
            //fetch tags
            let fetched: Map<string, Tag> = new Map();
            this.getTags(merge).then(tags => {
                let parentFetches: Promise<void>[] = [];
                for(let i = 0; i < tags.length; i++) {
                    fetched.set(tags[i].name, tags[i]);
                    //fetch parents
                    parentFetches.push(this.addParents(newList, diff.added, fetched, tags[i]));
                }
                return Promise.all(parentFetches);
            }).then(() => {
                //add new tags
                let adding: Promise<void>[] = [];
                for(let i = 0; i < newList.length; i++) {
                    if(!fetched.has(newList[i])) {
                        let tag = new Tag(newList[i], 'default');
                        fetched.set(tag.name, tag);
                        adding.push(this.addTag(tag));
                    }
                }
                return Promise.all(adding);
            }).then(() => {
                //update removed tags
                let updating: Promise<void>[] = [];
                for (let i = 0; i < diff.removed.length; i++) {
                    let removed: Tag = fetched.get(diff.removed[i]);
                    removed.removeRef(ref);
                    updating.push(this.updateTag(removed));
                }
                for (let i = 0; i < diff.added.length; i++) {
                    let added: Tag = fetched.get(diff.added[i]);
                    added.addRef(ref);
                    updating.push(this.updateTag(added));
                }

                return Promise.all(updating);
            }).then(() => {
                resolve();
            });
        });
        //return final list
    }

    /**
     * 
     * @param tempFile file path to the temp file
     * @param type the mime type of the file
     * @returns the permanent file path after rehosting
     */
    abstract reHost(tempFile: string, type: string, id: number): Promise<string>;
}

export default class Data {
    static async init(handler: DataHandler) {
        return new Promise<void[]>((resolve, reject) => {
            resolve(Promise.all([
                handler.addTagType(new TagType('Subjects', `Color:${Hue.green}`, 10)),
                handler.addTagType(new TagType('Photographer', `Color:${Hue.magenta}`, 20)),
                handler.addTagType(new TagType('Location', `Color:${Hue.cyan}`, 30)),
                handler.addTagType(new TagType('Context', `Color:${Hue.yellow}`, 40))
            ]));
        }).then(() => {
            return Promise.all([
                handler.addTag(new Tag('x', 'Context')),
                handler.addTag(new Tag('y', 'Subjects')),
                handler.addTag(new Tag('z', 'Location'))
            ]);
        }).then(() => {
            return Promise.all([
                handler.addTag(new Tag('xx', null, 'x')),
                handler.addTag(new Tag('yy', null, 'y')),
                handler.addTag(new Tag('zz', null, 'z'))
            ]);
        }).then(() => {
            return handler.addTag(new Tag('zzz', null, 'zz'))
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/a6/78/__scp_foundation_drawn_by_langbazi__sample-a6788af625a75e6a01cf24170853c751.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'A corner of a room',
                    ['xx']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/e1/6d/__ashen_one_dark_souls_and_1_more_drawn_by_conor_burke__sample-e16dd89ec5c0e2210dae609a58be8c04.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'A brave but foolish knight, fallen to flame and blood',
                    ['yy']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/88/17/__slave_knight_gael_dark_souls_and_1_more_drawn_by_junjiuk__sample-88172e085d8be0193ee3ced013b26ed1.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'He is forgotten',
                    ['zzz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/c9/5f/__hunter_and_micolash_host_of_the_nightmare_bloodborne_drawn_by_rashuu__sample-c95fbd43765275557e0a57e852cea958.jpg',
                    1733066171000,
                    ItemType.Image,
                    false,
                    'climb the stairs, you\'ve coem this far',
                    ['x', 'yy']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d8/67/__original_drawn_by_wayukako__sample-d8671b5e581753bf8dde6b7ed762afb4.jpg',
                    1733066171000,
                    ItemType.Image,
                    false,
                    'Ever upward',
                    ['xx', 'z']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d7/e8/__original_drawn_by_ashsadila__sample-d7e8c53ac85d834a342c7b752242f258.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'No more fighting... please...',
                    ['y', 'zz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d7/e1/__girls_frontline__sample-d7e1d1b35bd30d7794469680cc72e45c.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'Infinity awaits',
                    ['xx', 'yy', 'zzz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://www.bankersonline.com/sites/default/files/tools/99INVPOL.pdf',
                    1733066171000,
                    ItemType.Document,
                    true,
                    'A document!  A document!',
                    ['xx', 'yy', 'zzz']
                ));
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