import express, { Router } from "express";

import { DataHandler, Item, Tag, TagType } from "@rt/data";
import getArguments from "@utl/getArguments";

export default function deleter(): Router {
    const router: Router = express.Router();

    router.get('/', function(req, res) {
        res.redirect("/");
    });

    router.get('/item', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render('delete', getArguments(
                req.session.user,
                'Delete Item',
                -1,
                `Access denied`,
                '',
                ["delete"],
                {},
                ['You are not permitted to delete items.']
            ));
        } else {
            let itemID: number = +<string>req.query.id;
            res.render('delete', getArguments(
                req.session.user,
                'Delete Item',
                -1,
                `Are you sure you want to delete item#${itemID}?`,
                '',
                ["delete"],
                {
                    cancel: `/item?id=${itemID}`,
                    delete: `Item ${itemID}`
                }
            ));
        }
    });

    router.get('/tag', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role < 1) {
            res.render('delete', getArguments(
                req.session.user,
                'Delete Tag',
                -1,
                `Access Denied`,
                '',
                ["delete"],
                {},
                ['You are not permitted to delete tags.']
            ));
        } else {
            let name: string = <string>req.query.name;
            res.render('delete', getArguments(
                req.session.user,
                'Delete Tag',
                -1,
                `Are you sure you want to delete the tag "${name}"`,
                '',
                ["delete"],
                {
                    cancel: `/tag?name=${name}`,
                    delete: `Tag ${name}`
                }
            ));
        }
    });

    router.get('/tagType', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role <= 1) {
            res.render('layout', getArguments(
                req.session.user,
                'Delete Tag Type',
                -1,
                `Access Denied`,
                '',
                [],
                {},
                ['You are not permitted to delete tag types.']
            ));
        } else {
            let name: string = <string>req.query.name;
            if(name == 'default') {
                res.render('layout', getArguments(
                    req.session.user,
                    'Delete Tag Type',
                    -1,
                    `You cannot delete the default tag type`,
                    '',
                    [],
                    {},
                    ['You cannot delete the default tag type']
                ));
            } else {
                res.render('delete', getArguments(
                    req.session.user,
                    'Delete Tag Type',
                    -1,
                    `Are you sure you want to delete the tag type '${name}'?`,
                    '',
                    ["delete"],
                    {
                        cancel: `/search/tagTypes?tagMatch=${name}`,
                        delete: `TagType ${name}`
                    }
                ));
            }
        }
    });

    router.get('/user', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        if(req.session.user == undefined || req.session.user.role <= 1) {
            res.render('layout', getArguments(
                req.session.user,
                'Delete User',
                -1,
                `Access Denied`,
                '',
                [],
                {},
                ['You are not permitted to delete users.']
            ));
        } else {
            let username: string = <string>req.query.username;
            res.render('delete', getArguments(
                req.session.user,
                'Delete User',
                -1,
                `Are you sure you want to delete the user credentials for '${username}'?`,
                '',
                ["delete"],
                {
                    cancel: `/user?username=${username}`,
                    delete: `User ${username}`
                }
            ));
        }
    });

    return router;
}