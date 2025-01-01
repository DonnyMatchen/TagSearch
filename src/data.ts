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
            let out: number = 0;
            this.getParent(dataHandler).then(parent => {
                parent.getProximity(dataHandler).then(prox => {
                    out = prox + 1;
                });
            })
            return out;
        }
    }
}

class ItemOptions {
    tags?: string[] | string;
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
            let tags = options.tags;
            if(tags != undefined && dataHandler != undefined) {
                if(typeof tags == 'string') {
                    tags = dataHandler.tagsFromString(tags);
                }
                tags.forEach(tag => {
                    let foundTag: Tag;
                    dataHandler.getTag(tag).then(found => {
                        foundTag = found;
                    }, error => {
                        dataHandler.getTagType('default').then(type => {
                            foundTag = new Tag(tag, type);
                            dataHandler.addTag(foundTag);
                        })
                    }).finally(() => {
                        foundTag.addRef(this.id);
                        this.tags.push(foundTag.name);
                        dataHandler.updateTag(foundTag);
                    });
                });
                let tag: Tag = null;
                dataHandler.getTags(this.tags).forEach(async found => {
                    if(tag == null) {
                        tag = found;
                    }
                    while(tag != null) {
                        let parent: Tag;
                        await tag.getParent(dataHandler).then(cand => {
                            parent = cand;
                            if(!this.tags.includes(cand.name)) {
                                this.tags.push(tag.parent);
                                cand.addRef(this.id);
                                dataHandler.updateTag(parent);
                            }
                        }, error => {
                            parent = null;
                        });
                        tag = parent;
                    }
                });
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
    tagsChanged(dataHandler: DataHandler, newList: string[]) {
        let changes: Diff = this.diffTags(this.tags, newList);
        dataHandler.getTags(changes.removed).forEach(tag => {
            tag.removeRef(this.id);
            dataHandler.updateTag(tag);
        });
        changes.added.forEach(async tag => {
            let foundTag: Tag;
            await dataHandler.getTag(tag).then(found => {
                foundTag = found;
            }, error => {
                dataHandler.getTagType('default').then(type => {
                    foundTag = new Tag(tag, type);
                    dataHandler.addTag(foundTag);
                });
            }).finally(() => {
                foundTag.addRef(this.id);
                dataHandler.updateTag(foundTag);
            });
        });
        this.tags.splice(0, this.tags.length);
        newList.forEach(tag => this.tags.push(tag));
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
            await argon2.hash(newPassword + newSalt).then(hash => {
                this.hash = hash;
                this.state = UserState.Set;
                this.salt = newSalt;
            }, error => {
                this.state = UserState.Error;
                throw new PasswordError(error);
            });
        } else {
            throw new PasswordError('Verification failed');
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
    total: number;
    pageCount: number;

    constructor(results: E[], total: number, pageCount: number) {
        this.results = results;
        this.total = total;
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

    abstract getUsers(usernames: string[]): User[];
    abstract getTags(names: string[]): Tag[];
    abstract getTagTypes(names: string[]): TagType[];
    abstract getItems(ids: number[]): Item[];

    /**
     * Adds the user to the database.  If the user exists, it updates them instead of adding a duplicate.
     * @param user the user to add to the database
     * @returns true if the user was added successfully, false otherwise
     */
    abstract addUser(user: User): Promise<void>;
    /**
     * Adds the tag to the database.  If the tag exists, it updates it instead of adding a duplicate.
     * @param tag the tag to add to the database
     * @returns true if the tag was added successfully, false otherwise
     */
    abstract addTag(tag: Tag): Promise<void>;
    /**
     * Adds the tag type to the database.  If the tag type exists, it updates it instead of adding a duplicate.
     * @param type the tag type to add to the database
     * @returns true if the tag type was added successfully, false otherwise
     */
    abstract addTagType(type: TagType): Promise<void>;
    /**
     * Adds the item to the database.  If the item exists, it updates it instead of adding a duplicate.
     * @param item the item to add to the database
     * @returns true if the item was added successfully, false otherwise
     */
    abstract addItem(item: Item): Promise<void>;

    /**
     * 
     * @param user the new user to replace the old
     * @returns true if the user was updated, false if the user does not exist or was not updated
     */
    abstract updateUser(user: User): Promise<void>;
    /**
     * 
     * @param tag the new tag to replace the old
     * @returns true if the tag was updated, false if the tag does not exist or was not updated
     */
    abstract updateTag(tag: Tag): Promise<void>;
    /**
     * 
     * @param type the new tag type to replace the old
     * @returns true if the tag type was updated, false if the tag type does not exist or was not updated
     */
    abstract updateTagType(type: TagType): Promise<void>;
    /**
     * 
     * @param item the new item to replace the old
     * @returns true if the item was updated, false if the item does not exist or was not updated
     */
    abstract updateItem(item: Item, tags: string[]): Promise<void>;

    /**
     * 
     * @param user the user to be deleted
     * @returns true if the user was deleted, false otherwise
     */
    abstract deleteUser(user: User): Promise<void>;
    /**
     * 
     * @param tag the tag to be deleted
     * @returns true if the tag was deleted, false otherwise
     */
    abstract deleteTag(tag: Tag): Promise<void>;
    /**
     * 
     * @param type the tag type to be deleted
     * @returns true if the tag type was deleted, false otherwise
     */
    abstract deleteTagType(type: TagType): Promise<void>;
    /**
     * 
     * @param item the item to be deleted
     * @returns true if the item was deleted, false otherwise
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
                await this.getTag(tags[0]).then(found => {
                    reduced = found.refs;
                }, error => {
                    throw error;
                });
            }
        } else {
            this.getTags(tags).forEach(found => {
                let refList: number[] = found.refs;
                container.push(refList);
                refList.forEach(ref => {
                    if(!allRefs.includes(ref)) {
                        allRefs.push(ref);
                    }
                });
            })
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
        this.searchUsers('', -1, 1).then(results => {
            results.results.forEach(user => {
                if(user.role == Role.Admin) {
                    foundAdmin = true;
                }
            })
        })
        if(!foundAdmin) {
            let admin: User = new User('admin', Role.Admin);
            admin.setPassword('', 'toor').then(() => {
                this.addUser(admin);
                console.log(`[server]: Default admin account created.  Change the password ASAP`);
            });
        }
    }
}

export class TagError extends Error {}
export class TagTypeError extends Error {}
export class ItemError extends Error {}
export class UserError extends Error {}
export class PasswordError extends Error {}

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
        
        await handler.nextItemID().then(id => 
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/a6/78/__scp_foundation_drawn_by_langbazi__sample-a6788af625a75e6a01cf24170853c751.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['xx'],
                    desc: 'A corner of a room',
                    pub: true
                }
            ))
        );
        await handler.nextItemID().then(id => 
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/e1/6d/__ashen_one_dark_souls_and_1_more_drawn_by_conor_burke__sample-e16dd89ec5c0e2210dae609a58be8c04.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['yy'],
                    desc: 'A brave but foolish knight, fallen to flame and blood',
                    pub: true
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/88/17/__slave_knight_gael_dark_souls_and_1_more_drawn_by_junjiuk__sample-88172e085d8be0193ee3ced013b26ed1.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['zzz'],
                    desc: 'He is forgotten',
                    pub: true
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/c9/5f/__hunter_and_micolash_host_of_the_nightmare_bloodborne_drawn_by_rashuu__sample-c95fbd43765275557e0a57e852cea958.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['x', 'yy'],
                    desc: 'climb the stairs, you\'ve coem this far'
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d8/67/__original_drawn_by_wayukako__sample-d8671b5e581753bf8dde6b7ed762afb4.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['xx', 'z'],
                    desc: 'Ever upward'
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d7/e8/__original_drawn_by_ashsadila__sample-d7e8c53ac85d834a342c7b752242f258.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['y', 'zz'],
                    desc: 'No more fighting... please...',
                    pub: true
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://cdn.donmai.us/sample/d7/e1/__girls_frontline__sample-d7e1d1b35bd30d7794469680cc72e45c.jpg',
                1733066171000,
                ItemType.Image,
                {
                    tags: ['xx', 'yy', 'zzz'],
                    desc: 'Infinity awaits',
                    pub: true
                }
            ))
        );
        await handler.nextItemID().then(id =>
            handler.addItem(new Item(
                handler,
                id,
                'https://www.bankersonline.com/sites/default/files/tools/99INVPOL.pdf',
                1733066171000,
                ItemType.Document,
                {
                    tags: ['xx', 'yy', 'zzz'],
                    desc: 'A document!  A document!',
                    pub: true
                }
            ))
        );
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