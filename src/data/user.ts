import argon2 from 'argon2';

import { getRandomString } from '@da/data';
import { formColor, HslColor, Hue, Lum } from '@da/color';

export class PersonalConfig {
    tagLum: Lum;
    bg: HslColor;
    fg: HslColor;
    header: HslColor;
    msg: HslColor;
    theme: HslColor;
    bad: HslColor;
    good: HslColor;

    constructor(stripped: PersonalConfig);
    constructor(rawStr: string);

    constructor(input: string | PersonalConfig) {
        let rawObj: any;
        if (typeof input == 'string') {
            rawObj = JSON.parse(input);
        } else {
            rawObj = input;
        }

        this.tagLum = rawObj.tagLum;
        this.bg = new HslColor(rawObj.bg);
        this.fg = new HslColor(rawObj.fg);
        this.header = new HslColor(rawObj.header);
        this.msg = new HslColor(rawObj.msg);
        this.theme = new HslColor(rawObj.theme);
        this.bad = new HslColor(rawObj.bad);
        this.good = new HslColor(rawObj.good);
    }
}

export enum Role {
    Normal = 0,
    Family = 1,
    Admin = 2
}

export function roleToString(role: Role): string {
    switch (role) {
        case (Role.Normal): return 'Normal';
        case (Role.Family): return 'Family';
        case (Role.Admin): return 'Admin';
    }
}
export function roleFromString(str: string): Role {
    switch (str) {
        case ('Normal'): return Role.Normal;
        case ('Family'): return Role.Family;
        case ('Admin'): return Role.Admin;
    }
}

export enum UserState {
    New = 0,
    Set = 1,
    Error = -1
}

export class User {
    static getDefaultConfig(): PersonalConfig {
        return {
            tagLum: Lum.bright,
            bg: new HslColor(0, 0, 20),
            fg: new HslColor(0, 0, 90),
            msg: new HslColor(0, 0, 30),
            header: new HslColor(0, 0, 10),
            theme: formColor(Hue.teal, Lum.dark),
            bad: formColor(Hue.red, Lum.dark),
            good: formColor(Hue.green, Lum.dark)
        };
    }

    state: UserState;

    readonly username: string;
    hash: string;
    salt: string;
    role: Role;
    config: PersonalConfig;

    constructor(username: string, role: Role, config: string | PersonalConfig, hash?: string, salt?: string) {
        this.username = username;
        if (typeof config == 'string') {
            this.config = new PersonalConfig(config);
        } else {
            this.config = config;
        }
        this.role = role;
        if (hash && salt) {
            this.hash = hash;
            this.salt = salt;
            this.state = UserState.Set;
        } else {
            this.state = UserState.New;
            this.salt = getRandomString(15);
            this.hash = '';
        }
    }

    async check(test: string): Promise<boolean> {
        return argon2.verify(this.hash, test + this.salt);
    }

    async setPassword(oldPassword: string, newPassword: string) {
        return new Promise<boolean>((resolve, reject) => {
            if (this.state != UserState.Set) {
                resolve(true);
            } else {
                resolve(this.check(oldPassword));
            }
        }).then(change => {
            return new Promise<void>((resolve, reject) => {
                if (change) {
                    let newSalt: string = getRandomString(15);
                    argon2.hash(`${newPassword}${newSalt}`).then(hash => {
                        this.hash = hash;
                        this.state = UserState.Set;
                        this.salt = newSalt;
                        resolve();
                    }, (error: Error) => {
                        this.state = UserState.Error;
                        reject(error);
                    });
                } else {
                    reject(new Error('Verification failed'));
                }
            });
        });
    }

    roleToString() {
        return roleToString(this.role);
    }

    stateToString() {
        switch (this.state) {
            case (UserState.New): return 'Password Not Set';
            case (UserState.Set): return 'Password Set'
            case (UserState.Error): return 'Error Setting Password'
        }
    }
}