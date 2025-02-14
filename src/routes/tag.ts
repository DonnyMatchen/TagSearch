import express, { Router } from "express";

import { Tag, TagType } from "@da/tag";
import DataHandler from "@dh/dataHandler";
import getArguments from "@utl/getArguments";

export default function tag(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        let name: string = <string>req.query.name;
        if (name == undefined) {
            name = '';
        }
        let search: string = <string>req.query.tags;
        if (search == undefined) {
            search = '';
        }
        dataHandler.getTag(name).then(tag => {
            let codex: CodexSet = new CodexSet(dataHandler);
            codex.setup(tag).then(() => {
                res.render('tag', getArguments(
                    req.session.user,
                    req.session.config,
                    'Tag',
                    -1,
                    `Tag Named "${name}"`,
                    search,
                    {
                        active: false,
                        pageURL: '',
                        pageCount: 0,
                        pageNumber: 0
                    },
                    {
                        tag: tag,
                        codex: codex
                    }
                ));
            });
        }, (error: Error) => {
            res.render('tag', getArguments(
                req.session.user,
                req.session.config,
                'Tag',
                -1,
                `Tag Named "${name}"`,
                search,
                {
                    active: false,
                    pageURL: '',
                    pageCount: 0,
                    pageNumber: 0
                },
                {},
                ['The tag name was invalid, or not provided']
            ));
        });
    });

    return router;
}

class CodexSet {
    siblings: string[] = [];
    type: TagType;
    private dataHandler: DataHandler;

    constructor(dataHandler: DataHandler) {
        this.dataHandler = dataHandler;
    }

    async setup(tag: Tag) {
        return this.dataHandler.getTagType(tag.type).then(type => {
            this.type = type;
        }).then(() => {
            if (tag.parent != '') {
                this.dataHandler.getTag(tag.parent).then(parent => {
                    for (let i = 0; i < parent.children.length; i++) {
                        let tagName = parent.children[i];
                        if (tagName != tag.name) {
                            this.siblings.push(tagName);
                        }
                    }
                });
            }
        });
    }
}