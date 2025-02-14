import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';

import DataHandler from "@dh/dataHandler";
import { Item, ItemType } from "@da/item";
import { Tag, TagType } from '@da/tag';
import { Hue } from "@da/color";

export default class Data {
    static async init(handler: DataHandler) {
        return new Promise<void[]>((resolve, reject) => {
            resolve(Promise.all([
                handler.addTagType(new TagType('Subjects', `Color:${Hue.green}`, 10)),
                handler.addTagType(new TagType('Photographer', `Color:${Hue.magenta}`, 20)),
                handler.addTagType(new TagType('Location', `Color:${Hue.cyan}`, 30)),
                handler.addTagType(new TagType('Context', `Color:${Hue.yellow}`, 40))
            ]));
        }).then(() => {
            return Promise.all([
                handler.addTag(new Tag('x', 'Context')),
                handler.addTag(new Tag('y', 'Subjects')),
                handler.addTag(new Tag('z', 'Location'))
            ]);
        }).then(() => {
            return Promise.all([
                handler.addTag(new Tag('xx', null, 'x')),
                handler.addTag(new Tag('yy', null, 'y')),
                handler.addTag(new Tag('zz', null, 'z'))
            ]);
        }).then(() => {
            return handler.addTag(new Tag('zzz', null, 'zz'))
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/a6/78/__scp_foundation_drawn_by_langbazi__sample-a6788af625a75e6a01cf24170853c751.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'A corner of a room',
                    ['xx']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/e1/6d/__ashen_one_dark_souls_and_1_more_drawn_by_conor_burke__sample-e16dd89ec5c0e2210dae609a58be8c04.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'A brave but foolish knight, fallen to flame and blood',
                    ['yy']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/88/17/__slave_knight_gael_dark_souls_and_1_more_drawn_by_junjiuk__sample-88172e085d8be0193ee3ced013b26ed1.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'He is forgotten',
                    ['zzz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/c9/5f/__hunter_and_micolash_host_of_the_nightmare_bloodborne_drawn_by_rashuu__sample-c95fbd43765275557e0a57e852cea958.jpg',
                    1733066171000,
                    ItemType.Image,
                    false,
                    'climb the stairs, you\'ve come this far',
                    ['x', 'yy']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d8/67/__original_drawn_by_wayukako__sample-d8671b5e581753bf8dde6b7ed762afb4.jpg',
                    1733066171000,
                    ItemType.Image,
                    false,
                    'Ever upward',
                    ['xx', 'z']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d7/e8/__original_drawn_by_ashsadila__sample-d7e8c53ac85d834a342c7b752242f258.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'No more fighting... please...',
                    ['y', 'zz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://cdn.donmai.us/sample/d7/e1/__girls_frontline__sample-d7e1d1b35bd30d7794469680cc72e45c.jpg',
                    1733066171000,
                    ItemType.Image,
                    true,
                    'Infinity awaits',
                    ['xx', 'yy', 'zzz']
                ));
            });
        }).then(() => {
            return handler.nextItemID().then(async id => {
                return handler.addItem(new Item(
                    id,
                    'https://www.bankersonline.com/sites/default/files/tools/99INVPOL.pdf',
                    1733066171000,
                    ItemType.Document,
                    true,
                    'A document!  A document!',
                    ['xx', 'yy', 'zzz']
                ));
            });
        });
    }
}

/**
 * a byte array of size `size * 5` is generated, then encoded into base64.  
 * this results in an output string of length `size * 8`
 * @param size the size of the string in increments of 8 characters
 * @returns a base64 encoded byte array, ensuring that random string is alphanumeric.
 */
export function getRandomString(size: number): string {
    return Buffer.from(Array.from(randomBytes(size * 5))).toString('base64');
}

/**
 * a byte array of size `size` is generated, then encoded into hex.  
 * this results in an output string of length `size * 2`
 * @param size the size of the string in increments of 2 characters
 * @returns a hex encoded byte array, ensuring that random string is file-path friendly.
 */
export function getRandomHexString(size: number): string {
    return randomBytes(size).toString('hex');
}