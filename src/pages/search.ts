import express, { Router } from "express";
import { DataHandler, TagType } from '@rt/data';
import partition from "@utl/partition";
import getArguments from "@utl/getArguments";

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
                ['itemSearch'],
                {
                    results: partition(results.results, 6),
                    pages: results.pageCount,
                    page: +page
                }
            ));
        }, (error:Error) => {
            res.render('search', getArguments(
                req.session.user,
                'Search',
                1,
                ``,
                search,
                ['itemSearch'],
                {
                    results: [],
                    pages: 1,
                    page: 1
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
        dataHandler.searchTags(tagSearch, dataHandler.getPageLimit(), +page).then(results => {
            let list: string[] = [];
            results.results.forEach(tag => {
                if(!list.includes(tag.type)) {
                    list.push(tag.type);
                }
            });
            let map: Map<string, TagType> = new Map();
            dataHandler.getTagTypes(list).forEach(type => {
                map.set(type.name, type);
            });
            res.render('tagSearch', getArguments(
                req.session.user,
                'Search Results',
                2,
                `${results.total} result(s) matching "${tagSearch}"`,
                search,
                ['tagSearch'],
                {
                    results: results.results,
                    types: map,
                    tagSearch: tagSearch,
                    pages: results.pageCount,
                    page: +page
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
                ['tagSearch'],
                {
                    results: results.results,
                    tagSearch: tagSearch,
                    pages: results.pageCount,
                    page: +page
                }
            ));
        });
    });

    router.post('/', async (req, res) => {
        if(req.session.user == undefined) {
            res.redirect("/search");
        } else {
            let master: string[] = req.body.del.split(' ');
            let skip: boolean = false;
            switch(master[0]) {
                case('Item'):
                    if(req.session.user.role < 1) {
                        skip = true;
                    } else {
                        await dataHandler.getItem(+master[1]).then(async item => {
                            await dataHandler.deleteItem(item).then(async () => {
                                res.setHeader('Content-Type', 'text/html');
                                await dataHandler.searchItems('', dataHandler.getPageLimit(), 1, req.session.user).then(results => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search Results',
                                        1,
                                        `${results.total} result(s) from search ""`,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: partition(results.results, 6),
                                            pages: results.pageCount,
                                            page: 1
                                        },
                                        [], ['Item deleted successfuly.']
                                    ));
                                }, (error:Error) => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search',
                                        1,
                                        ``,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: [],
                                            pages: 1,
                                            page: 1
                                        },
                                        [error.message]
                                    ));
                                });
                            }, (error:Error) => {
                                skip = true;
                            });
                        }, (error:Error) => {
                            skip = true;
                        });
                    }
                break;
                case('Tag'):
                    if(req.session.user.role < 1) {
                        skip = true;
                    } else {
                        await dataHandler.getTag(master[1]).then(async tag => {
                            await dataHandler.deleteTag(tag).then(async () => {
                                res.setHeader('Content-Type', 'text/html');
                                await dataHandler.searchItems('', dataHandler.getPageLimit(), 1, req.session.user).then(results => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search Results',
                                        1,
                                        `${results.total} result(s) from search ""`,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: partition(results.results, 6),
                                            pages: results.pageCount,
                                            page: 1
                                        },
                                        [], ['Tag deleted successfuly.']
                                    ));
                                }, (error:Error) => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search',
                                        1,
                                        ``,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: [],
                                            pages: 1,
                                            page: 1
                                        },
                                        [error.message]
                                    ));
                                });
                            }, (error:Error) => {
                                skip = true;
                            });
                        }, (error:Error) => {
                            skip = true;
                        });
                    }
                break;
                case('TagType'):
                    if(req.session.user.role < 2) {
                        skip = true;
                    } else {
                        await dataHandler.getTagType(master[1]).then(async type => {
                            await dataHandler.deleteTagType(type).then(async () => {
                                res.setHeader('Content-Type', 'text/html');
                                await dataHandler.searchItems('', dataHandler.getPageLimit(), 1, req.session.user).then(results => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search Results',
                                        1,
                                        `${results.total} result(s) from search ""`,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: partition(results.results, 6),
                                            pages: results.pageCount,
                                            page: 1
                                        },
                                        [], ['Tag Type deleted successfuly.']
                                    ));
                                }, (error:Error) => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search',
                                        1,
                                        ``,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: [],
                                            pages: 1,
                                            page: 1
                                        },
                                        [error.message]
                                    ));
                                });
                            }, (error:Error) => {
                                skip = true;
                            });
                        }, (error:Error) => {
                            skip = true;
                        });
                    }
                break;
                case('User'):
                    if(req.session.user.role < 2) {
                        skip = true;
                    } else {
                        await dataHandler.getUser(master[1]).then(async user => {
                            await dataHandler.deleteUser(user).then(async () => {
                                res.setHeader('Content-Type', 'text/html');
                                await dataHandler.searchItems('', dataHandler.getPageLimit(), 1, req.session.user).then(results => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search Results',
                                        1,
                                        `${results.total} result(s) from search ""`,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: partition(results.results, 6),
                                            pages: results.pageCount,
                                            page: 1
                                        },
                                        [], ['User deleted successfuly.']
                                    ));
                                }, (error:Error) => {
                                    res.render('search', getArguments(
                                        req.session.user,
                                        'Search',
                                        1,
                                        ``,
                                        '',
                                        ['itemSearch'],
                                        {
                                            results: [],
                                            pages: 1,
                                            page: 1
                                        },
                                        [error.message]
                                    ));
                                });
                            }, (error:Error) => {
                                skip = true;
                            });
                        }, (error:Error) => {
                            skip = true;
                        });
                    }
                break;
            }
            if(skip) {
                res.redirect('/search');
            }
        }
    });
    
    return router;
}