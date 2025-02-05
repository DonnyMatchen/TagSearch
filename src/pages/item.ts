import express, { Router } from "express";
import { DataHandler, Tag, TagType } from '@rt/data';
import getArguments from "@utl/getArguments";

export default function item(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        let id: string = <string>req.query.id;
        if(id == undefined) {
            id == '-1'
        }
        let search: string = <string>req.query.tags;
        if(search == undefined) {
            search = '';
        }
        dataHandler.getItem(+id).then(item => {
            if(item && (item.pub || (req.session.user != undefined && req.session.user.role >= 1))) {
                let tagCodex: TagsCodex;
                let types: TagType[] = [];
                getTagObject(dataHandler, item.tags).then(codex => {
                    tagCodex = codex;
                    return tagCodex.getTagTypes()
                }).then(foundTypes => {
                    for(let i = 0; i < foundTypes.length; i++) {
                        types.push(foundTypes[i]);
                    }
                    types.sort((a: TagType, b: TagType) => {
                        return a.order - b.order;
                    });
                    res.render('item', getArguments(
                        req.session.user,
                        'Item',
                        -1,
                        `Item Number: ${id}`,
                        search,
                        {
                            active: false,
                            pageURL: '',
                            pageCount: 0,
                            pageNumber: 0
                        },
                        {
                            item: item,
                            tags: tagCodex.codex,
                            indents: tagCodex.indents,
                            types: types
                        }
                    ));
                });
            } else {
                res.render('item', getArguments(
                    req.session.user,
                    'Item',
                    -1,
                    `Access Denied`,
                    search,
                    {
                        active: false,
                        pageURL: '',
                        pageCount: 0,
                        pageNumber: 0
                    },
                    {},
                    ['You do not have access to this item.']
                ));
            }
        }, (error:Error) => {
            res.render('item', getArguments(
                req.session.user,
                'Item',
                -1,
                `No item here`,
                search,
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['The item ID was invalid, the item does not exist, or none was provided.']
            ));
        });
    });
    
    return router;
}

async function getTagObject(dataHandler: DataHandler, tags: string[]): Promise<TagsCodex> {
    //let parents: Tag[] = [];
    let codex: TagsCodex = new TagsCodex(dataHandler);
    let out: Tag[] = [];

    return new Promise<TagsCodex>((resolve, reject) => {
        let parents: string[] = [];
        let tagMap: Map<string, Tag> = new Map();
        dataHandler.getTags(tags).then(async foundTags => {
            for(let i = 0; i < foundTags.length; i++) {
                let current = foundTags[i];
                tagMap.set(current.name, current);
                if(current.parent != '' && !parents.includes(current.parent)) {
                    parents.push(current.parent);
                }
            }
            for(let i = 0; i < parents.length; i++) {
                tagMap.delete(parents[i]);
            }
            let out = [...tagMap.values()];
            out.sort((a, b) => a.name.localeCompare(b.name));
            for(let i = 0; i < out.length; i++) {
                await codex.add(out[i].type, out[i]);
            }
            resolve(codex);
        }, error => reject(error));
    });
}

class TagsCodex {
    codex: Map<string, Tag[]> = new Map();
    indents: Map<string, number> = new Map();
    private dataHandler: DataHandler;

    constructor(dataHandler: DataHandler) {
        this.dataHandler = dataHandler;
    }

    async add(key: string, tag: Tag) {
        return new Promise<void>((resolve, reject) => {
            if(!this.codex.has(key)) {
                this.codex.set(key, []);
            }
            new Promise<void>((resolve1, reject1) => {
                if(tag.parent != '') {
                    tag.getParent(this.dataHandler).then(parent => resolve1(this.add(key, parent)));
                } else {
                    resolve1();
                }
            }).then(() => {
                this.codex.get(key).push(tag);
                return tag.getProximity(this.dataHandler)
            }).then(prox => {
                this.indents.set(tag.name, prox);
                resolve();
            });
        });
    }

    async getTagTypes(): Promise<TagType[]> {
        return this.dataHandler.getTagTypes([...this.codex.keys()]);
    }
}

async function getParents(dataHandler: DataHandler, tag: Tag): Promise<Tag[]> {
    return new Promise<Tag[]>((resolve, reject) => {
        let out: Tag[] = [];
        new Promise<void>((resolve1, reject1) => {
            if(tag.parent != '') {
                let parent: Tag;
                tag.getParent(dataHandler).then(async prnt => {
                    parent = prnt;
                    return getParents(dataHandler, prnt);
                }).then(parents => {
                    out = parents.concat(parent);
                    resolve1();
                });
            } else {
                resolve1();
            }
        }).then(() => {
            resolve(out);
        });
    });
}