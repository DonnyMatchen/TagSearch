import express, { Express, Request, Response, Router } from "express";
import Data, { DataHandler, Item, Tag, TagError, TagType } from '@rt/data';
import getArguments from "@utl/getArguments";

export default function tag(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", function (req, res) {
        res.setHeader('Content-Type', 'text/html');
        let name: string = <string>req.query.name;
        if(name == undefined) {
            name = '';
        }
        let search: string = <string>req.query.tags;
        if(search == undefined) {
            search = '';
        }
        dataHandler.getTag(name).then(tag => {
            let codex: CodexSet = new CodexSet(dataHandler);
            codex.setup(tag);
            res.render('tag', getArguments(
                req.session.user,
                'Tag',
                -1,
                `Tag Named "${name}"`,
                search,
                ['tagDisplay'],
                {
                    tag: tag,
                    codex: codex
                }
            ));
        }, error => {
            res.render('tag', getArguments(
                req.session.user,
                'Tag',
                -1,
                `Tag Named "${name}"`,
                search,
                ['tagDisplay'],
                {
                    tag: tag
                },
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
        let foundType: TagType;
        await this.dataHandler.getTagType(tag.type).then(type => {
            foundType = type;
        });
        if(tag.parent != null) {
            this.dataHandler.getTag(tag.parent).then(parent => {
                parent.children.forEach(tagName => {
                    if(tagName != tag.name) {
                        this.siblings.push(tagName);
                    }
                });
            });
        }
    }
}