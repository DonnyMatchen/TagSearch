import express, { Router } from "express";
import { DataHandler, TagType } from '@rt/data';
import partition from "@utl/partition";
import getArguments, { Arguments } from "@utl/getArguments";

export default function search(dataHandler: DataHandler): Router {
    const router: Router = express.Router();

    router.get("/", (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let search: string = <string>req.query.tags;
        let page: string = <string>req.query.page;
        if(req.query.tags == null) {
            search = '';
        }
        if(page == null) {
            page = '1';
        }
        dataHandler.searchItems(search, dataHandler.getPageLimit(), +page, req.session.user).then(results => {
            res.render('search', getArguments(
                req.session.user,
                'Search Results',
                1,
                `${results.total} result(s) from search "${search}"`,
                search,
                {
                    active: true,
                    pageURL: `${Arguments.url}/search?tags=${search}&page=`,
                    pageCount: results.pageCount,
                    pageNumber: +page
                },
                {
                    results: partition(results.results, 6)
                }
            ));
        }, (error:Error) => {
            res.render('search', getArguments(
                req.session.user,
                'Search',
                1,
                ``,
                search,
                {
                    active: true,
                    pageURL: `${Arguments.url}/search?tags=${search}&`,
                    pageCount: 1,
                    pageNumber: 1
                },
                {
                    results: []
                },
                [error.message]
            ));
        });
    });

    router.get("/tags", (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let search: string = <string>req.query.tags;
        let page: string = <string>req.query.page;
        if(req.query.tags == null) {
            search = '';
        }
        if(page == null) {
            page = '1';
        }
        let tagSearch: string = <string> req.query.tagMatch;
        if(req.query.tagMatch == null) {
            tagSearch = '';
        }
        dataHandler.searchTags(tagSearch, dataHandler.getPageLimit(), +page).then(async results => {
            let list: string[] = [];
            for(let i = 0; i < results.results.length; i++) {
                let tag = results.results[i];
                if(!list.includes(tag.type)) {
                    list.push(tag.type);
                }
            }
            let map: Map<string, TagType> = new Map();
            await dataHandler.getTagTypes(list).then(types => {
                for(let i = 0; i < types.length; i++) {
                    map.set(types[i].name, types[i]);
                }
            });
            res.render('tagSearch', getArguments(
                req.session.user,
                'Search Results',
                2,
                `${results.total} result(s) matching "${tagSearch}"`,
                search,
                {
                    active: true,
                    pageURL: `${Arguments.url}/search/tags?tagMatch=${tagSearch}&tags=${search}&page=`,
                    pageCount: results.pageCount,
                    pageNumber: +page
                },
                {
                    results: results.results,
                    types: map,
                    tagSearch: tagSearch
                }
            ));
        });
        
    });

    router.get("/tagTypes", (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        let search: string = <string>req.query.tags;
        let page: string = <string>req.query.page;
        if(req.query.tags == null) {
            search = '';
        }
        if(page == null) {
            page = '1';
        }
        let tagSearch: string = <string> req.query.tagTypeMatch;
        if(req.query.tagTypeMatch == null) {
            tagSearch = '';
        }
        dataHandler.searchTagTypes(tagSearch, dataHandler.getPageLimit(), +page).then(results => {
            res.render('tagType', getArguments(
                req.session.user,
                'Search Results',
                3,
                `${results.total} result(s) matching "${tagSearch}"`,
                search,
                {
                    active: true,
                    pageURL: `${Arguments.url}/search/tagTypes?tagTypeMatch=${tagSearch}&tags=${search}&page=`,
                    pageCount: results.pageCount,
                    pageNumber: +page
                },
                {
                    results: results.results,
                    tagSearch: tagSearch
                }
            ));
        });
    });
    
    return router;
}