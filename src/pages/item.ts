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
                let tagCodex: TagsCodex = getTagObject(dataHandler, item.tags);
                let types: TagType[] = tagCodex.getTagTypes();
                types.sort((a: TagType, b: TagType) => {
                    return a.order - b.order;
                })
                res.render('item', getArguments(
                    req.session.user,
                    'Item',
                    -1,
                    `Item Number: ${id}`,
                    search,
                    ['itemDisplay'],
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
                    ['itemDisplay'],
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
                ['itemDisplay'],
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

function getTagObject(dataHandler: DataHandler, tags: string[]): TagsCodex {
    let parents: Tag[] = [];
    let codex: TagsCodex = new TagsCodex(dataHandler);
    dataHandler.getTags(tags).forEach(async tag => {
        if (tag.parent != null) {
            await getParents(dataHandler, tag).then(pList => {
                parents = parents.concat(pList);
            });
        }
    });
    parents.forEach(parent => {
        if(tags.includes(parent.name)) {
            tags.splice(tags.indexOf(parent.name), 1);
        }
    });

    tags.sort((a, b) => {
        return a.localeCompare(b);
    });
    dataHandler.getTags(tags).forEach(tag => {
        codex.add(tag.type, tag);
    });
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
            await tag.getParent(this.dataHandler).then(parent => {
                this.add(key, parent);
            });
        }
        this.codex.get(key).push(tag);
        await tag.getProximity(this.dataHandler).then(prox => {
            this.indents.set(tag.name, prox);
        });
    }

    getTagTypes(): TagType[] {
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