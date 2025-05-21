export enum ItemType {
    Image = 0,
    Document = 1,
    Video = 2,
    Audio = 3,
    Unknown = 10
}

export class Item {
    readonly id: number;
    source: string;
    date: number;
    readonly tags: string[];
    desc: string;
    type: ItemType;
    pub: boolean;
    filePath: string;

    constructor(id: number, source: string, date: number, type: ItemType, pub: boolean, desc?: string, tags?: string[], filePath?: string) {
        this.id = id;
        this.source = source;
        this.date = date;
        this.type = type;
        this.tags = [];
        this.pub = pub;
        this.desc = desc ? desc : '';
        this.filePath = filePath ? filePath : '';
        if (tags) {
            tags.forEach(tag => {
                if (tag != '') {
                    this.tags.push(tag);
                }
            });
        }
    }
}

export function getItemType(src: string): ItemType {
    let img = [
        '.bmp',
        '.gif',
        '.ico',
        '.jpg',
        '.jpeg',
        '.png',
        '.svg',
        '.webp'
    ];
    let vid = [
        '.avi',
        '.mp4',
        '.mpeg',
        '.ogv',
        '.webm'
    ];
    let aud = [
        '.aac',
        '.mid',
        '.midi',
        '.mp3',
        '.oga',
        '.wav',
        '.weba',
        '.m4a'
    ];
    let doc = [
        '.pdf',
        '.txt',
        '.css',
        '.csv',
        '.html',
        '.htm',
        '.js',
        '.mjs',
        '.json',
        '.xml'
    ];

    for (let i = 0; i < img.length; i++) {
        if (src.includes(img[i])) {
            return ItemType.Image;
        }
    }
    for (let i = 0; i < vid.length; i++) {
        if (src.includes(vid[i])) {
            return ItemType.Video;
        }
    }
    for (let i = 0; i < aud.length; i++) {
        if (src.includes(aud[i])) {
            return ItemType.Audio;
        }
    }
    for (let i = 0; i < doc.length; i++) {
        if (src.includes(doc[i])) {
            return ItemType.Document;
        }
    }
    return ItemType.Unknown;
}