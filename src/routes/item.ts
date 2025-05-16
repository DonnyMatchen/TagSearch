import express, { Router } from "express";

import { Tag, TagType } from "@da/tag";
import DataHandler from "@dh/dataHandler";
import getArguments from "@utl/getArguments";

export default function item(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        let id: string = <string>req.query.id;
        if (id == undefined) {
            id == '-1'
        }
        let search: string = <string>req.query.tags;
        if (search == undefined) {
            search = '';
        }
        dataHandler.getItem(+id).then(item => {
            if (item && (item.pub || (req.session.user != undefined && req.session.user.role >= 1))) {
                let tagCodex: TagsCodex;
                let types: TagType[] = [];
                getTagObject(dataHandler, item.tags).then(codex => {
                    tagCodex = codex;
                    return tagCodex.getTagTypes()
                }).then(foundTypes => {
                    for (let i = 0; i < foundTypes.length; i++) {
                        types.push(foundTypes[i]);
                    }
                    types.sort((a: TagType, b: TagType) => {
                        return a.order - b.order;
                    });
                    res.status(200).render('item', getArguments(
                        req.session.user,
                        req.session.config,
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
                res.status(401).render('item', getArguments(
                    req.session.user,
                    req.session.config,
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
        }, (error: Error) => {
            res.status(200).render('item', getArguments(
                req.session.user,
                req.session.config,
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

    return new Promise<TagsCodex>((resolve, reject) => {
        let parents: string[] = [];
        let tagMap: Map<string, Tag> = new Map();
        let foundTags: Tag[] = [];
        dataHandler.getTags(tags).then(found => {
            foundTags = found;
            let proxes: Promise<number>[] = [];
            for (let i = 0; i < foundTags.length; i++) {
                proxes.push(foundTags[i].getProximity(dataHandler));
            }
            return Promise.all(proxes)
        }).then(proxes => {
            let map: Map<string, number> = new Map();
            let max: number = 0;
            for (let i = 0; i < foundTags.length; i++) {
                map.set(foundTags[i].name, proxes[i]);
                if (proxes[i] > max) {
                    max = proxes[i];
                }
            }
            let codexify: Promise<void>[] = [];
            for (let i = 0; i <= max; i++) {
                for (let j = 0; j < foundTags.length; j++) {
                    if (map.get(foundTags[j].name) == i) {
                        codexify.push(codex.add(foundTags[j].type, foundTags[j]));
                    }
                }
            }
            return Promise.all(codexify);
        }, err => reject(err)).then(() => {
            resolve(codex);
        });
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
            if (!this.codex.has(key)) {
                this.codex.set(key, []);
            }
            let current: Tag[] = this.codex.get(key);
            tag.getProximity(this.dataHandler).then(prox => {
                this.indents.set(tag.name, prox);
            }).then(() => {
                let index: number = -1;
                if (tag.parent != '') {
                    for (let i = 0; i < current.length; i++) {
                        if (current[i].name == tag.parent) {
                            index = i + 1;
                            break;
                        }
                    }
                    if (index >= 0) {
                        current.splice(index, 0, tag);
                        resolve();
                    }
                }
                if (index == -1) {
                    current.push(tag);
                    resolve();
                }
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
            if (tag.parent != '') {
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