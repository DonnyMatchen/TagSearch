import { Item } from "@da/item";
import { SearchResults } from "@da/search";
import { Tag, TagType } from "@da/tag";
import { Role, User } from "@da/user";

class Diff {
    added: string[] = [];
    removed: string[] = [];
}

export default abstract class DataHandler {
    /**
     * This is for initializing data connections
     */
    abstract init(): Promise<void>;

    abstract getAdminCount(): Promise<number>;

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
    abstract searchItems(search: string, pageSize: number, pageNumber: number, user: User): Promise<SearchResults<Item>>;

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
            if (!out.includes(value)) {
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
        return new Promise<number[]>((resolve, reject) => {
            let container: number[][] = [];
            let allRefs: number[] = [];
            let reduced: number[] = [];
            let tags: string[] = this.tagsFromString(input);
            if (tags.length < 2) {
                if (tags.length == 1) {
                    this.getTag(tags[0]).then(found => {
                        resolve(found.refs);
                    }, (error: Error) => {
                        reject(error);
                    });
                } else {
                    resolve([]);
                }
            } else {
                let tagFetch: Promise<Tag>[] = [];
                tags.forEach(tagName => {
                    tagFetch.push(new Promise((resolve1, reject1) => {
                        this.getTag(tagName).then(tag => {
                            if (tag) {
                                resolve1(tag);
                            } else {
                                reject1(new Error(`Tag "${tagName}" not found.`))
                            }
                        })
                    }));
                });
                Promise.all(tagFetch).then(tags => {
                    for (let i = 0; i < tags.length; i++) {
                        let found = tags[i];
                        let refList: number[] = found.refs;
                        container.push(refList);
                        refList.forEach(ref => {
                            if (!allRefs.includes(ref)) {
                                allRefs.push(ref);
                            }
                        });
                    }
                    for (let i = 0; i < allRefs.length; i++) {
                        let ref = allRefs[i];
                        let include = true;
                        for (let j = 0; j < container.length; j++) {
                            if (!container[j].includes(ref)) {
                                include = false;
                                break;
                            }
                        }
                        if (include) {
                            reduced.push(ref);
                        }
                    }
                    resolve(reduced);
                }, (error: Error) => reject(error));
            }
        });
    }

    async ensureAdmin() {
        return new Promise<void>((resolve, reject) => {
            this.getAdminCount().then(count => {
                if (count > 0) {
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
    async ensureDefaultType() {
        return new Promise<void>((resolve, reject) => {
            this.getTagType('default').then(type => {
                if (type) {
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
            if (!newList.includes(tag)) {
                changes.removed.push(tag);
            }
        });
        newList.forEach(newTag => {
            let contains: boolean = false;
            oldList.forEach(oldTag => {
                if (oldTag == newTag) {
                    contains = true;
                    return;
                }
            });
            if (!contains) {
                changes.added.push(newTag)
            }
        });
        return changes;
    }

    private mergeTags(oldList: string[], newList: string[]): string[] {
        let out = [...oldList];
        newList.forEach(tagName => {
            if (!out.includes(tagName)) {
                out.push(tagName);
            }
        });
        return out;
    }

    private async addParents(newList: string[], diffAdded: String[], fetched: Map<string, Tag>, tag: Tag): Promise<void> {
        return new Promise((resolve, reject) => {
            if (tag.parent != '' && !fetched.has(tag.parent)) {
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
        let rem: number[] = [];
        for (let i = 0; i < oldList.length; i++) {
            if (oldList[i] == '') {
                rem.push(i);
            }
        }
        for (let i = 0; i < rem.length; i++) {
            oldList.splice(rem[i], 1);
        }
        rem = [];
        for (let i = 0; i < newList.length; i++) {
            if (newList[i] == '') {
                rem.push(i);
            }
        }
        for (let i = 0; i < rem.length; i++) {
            newList.splice(rem[i], 1);
        }
        //diff
        let diff = this.diffTags(oldList, newList);
        let merge = this.mergeTags(oldList, newList);

        return new Promise<void>((resolve, reject) => {
            //fetch tags
            let fetched: Map<string, Tag> = new Map();
            this.getTags(merge).then(tags => {
                let parentFetches: Promise<void>[] = [];
                for (let i = 0; i < tags.length; i++) {
                    fetched.set(tags[i].name, tags[i]);
                }
                //fetch parents
                for (let i = 0; i < tags.length; i++) {
                    parentFetches.push(this.addParents(newList, diff.added, fetched, tags[i]));
                }
                return Promise.all(parentFetches);
            }).then(() => {
                //add new tags
                let adding: Promise<void>[] = [];
                for (let i = 0; i < newList.length; i++) {
                    if (!fetched.has(newList[i])) {
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
    abstract reHost(tempFile: string, type: string, extension: string, id: number): Promise<string[]>;
}