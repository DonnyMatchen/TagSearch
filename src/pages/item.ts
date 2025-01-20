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
        dataHandler.getItem(+id).then(async item => {
            if(item.pub || req.session.user.role >= 1) {
                let tagCodex: TagsCodex;
                await getTagObject(dataHandler, item.tags).then(codex => tagCodex = codex);
                let types: TagType[] = [];
                await tagCodex.getTagTypes().then(foundTypes => {
                    for(let i = 0; i < foundTypes.length; i++) {
                        types.push(foundTypes[i]);
                    }
                });
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
    let parents: Tag[] = [];
    let codex: TagsCodex = new TagsCodex(dataHandler);
    let out: Tag[] = [];
    await dataHandler.getTags(tags).then(async tags => {
        for(let i = 0; i < tags.length; i++) {
            let tag = tags[i];
            if (tag.parent != null) {
                await getParents(dataHandler, tag).then(pList => {
                    for(let i = 0; i < pList.length; i++) {
                        let parent = pList[i];
                        if(!parents.includes(parent)) {
                            parents.push(parent);
                        }
                    }
                });
            }
            out.push(tag);
        }
    });

    for(let i = 0; i < parents.length; i++) {
        let parent = parents[i];
        if(out.includes(parent)) {
            out.splice(out.indexOf(parent), 1);
        }
    }

    out.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    for(let i = 0; i < out.length; i++) {
        let tag = out[i];
        await codex.add(tag.type, tag);
    }
    return codex;
}

class TagsCodex {
    codex: Map<string, Tag[]> = new Map();
    indents: Map<string, number> = new Map();
    private dataHandler: DataHandler;

    constructor(dataHandler: DataHandler) {
        this.dataHandler = dataHandler;
    }

    async add(key: string, tag: Tag) {
        if(!this.codex.has(key)) {
            this.codex.set(key, []);
        }
        if(tag.parent != null) {
            await tag.getParent(this.dataHandler).then(async parent => await this.add(key, parent));
        }
        this.codex.get(key).push(tag);
        await tag.getProximity(this.dataHandler).then(prox => {
            this.indents.set(tag.name, prox);
        });
    }

    async getTagTypes(): Promise<TagType[]> {
        return this.dataHandler.getTagTypes([...this.codex.keys()]);
    }
}

async function getParents(dataHandler: DataHandler, tag: Tag): Promise<Tag[]> {
    let out: Tag[] = [];
    if(tag.parent != null) {
        await tag.getParent(dataHandler).then(async parent => {
            await getParents(dataHandler, parent).then(parents => {
                out = parents.concat(parent);
            });
        });
    }
    return out;
}