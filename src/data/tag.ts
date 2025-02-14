import DataHandler from '@dh/dataHandler';
import { ColorConv, HslColor, Lum } from '@da/color';

export class TagType {
    readonly name: string;
    color: ColorConv;
    order: number;

    constructor(name: string, color: string, order: number) {
        this.name = name;
        this.color = new ColorConv(color);
        this.order = order;
    }

    getColor(lum: Lum): HslColor {
        return this.color.getHSL(lum);
    }
    getColorString(lum: Lum): string {
        let color = this.getColor(lum);
        return `HSL(${color.h}, ${color.s}%, ${color.l}%)`
    }
}

export class Tag {
    readonly name: string;
    type: string;
    parent: string;
    children: string[];
    readonly refs: number[];

    constructor(name: string, type: string, parent?: string, refs?: string[], children?: string[]) {
        this.name = name;
        this.parent = '';
        if (parent) {
            this.parent = parent;
        }
        this.type = type;
        this.children = [];
        if (children) {
            children.forEach(str => {
                if (str != '') {
                    this.children.push(str);
                }
            });
        }
        this.refs = [];
        if (refs) {
            refs.forEach(str => {
                if (str != '') {
                    this.refs.push(+str);
                }
            });
        }
    }

    async getParent(dataHandler: DataHandler): Promise<Tag> {
        return dataHandler.getTag(this.parent);
    }

    async getChildren(dataHandler: DataHandler): Promise<Tag[]> {
        return dataHandler.getTags(this.children);
    }

    addRef(ref: number) {
        if (!this.refs.includes(ref)) {
            this.refs.push(ref);
        }
    }
    removeRef(ref: number) {
        if (this.refs.includes(ref)) {
            this.refs.splice(this.refs.indexOf(ref), 1);
        }
    }

    addChild(child: string) {
        if (!this.children.includes(child)) {
            this.children.push(child);
        }
    }
    removeChild(child: string) {
        if (this.children.includes(child)) {
            this.children.splice(this.children.indexOf(child), 1);
        }
    }

    async getProximity(dataHandler: DataHandler): Promise<number> {
        return new Promise<number>((resolve, rejct) => {
            if (this.parent == '') {
                resolve(0);
            } else {
                this.getParent(dataHandler).then(parent => parent.getProximity(dataHandler)).then(prox => {
                    resolve(prox + 1);
                });
            }
        });
    }
}