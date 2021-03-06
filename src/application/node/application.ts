/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as http from 'http';
import * as express from 'express';
import {inject, named, injectable} from "inversify";
import { ExtensionProvider } from '../common/extension-provider';

export const ExpressContribution = Symbol("ExpressContribution");
export interface ExpressContribution {
    configure?(app: express.Application): void;
    onStart?(server: http.Server): void;
}

/**
 * The main entry point for Theia applications.
 */
@injectable()
export class BackendApplication {

    private app: express.Application;

    constructor(@inject(ExtensionProvider) @named(ExpressContribution) private contributionsProvider: ExtensionProvider<ExpressContribution>) {
    }

    start(port: number = 3000): Promise<void> {
        const contributions = this.contributionsProvider.getExtensions()
        this.app = express();
        for (const contrib of contributions) {
            if (contrib.configure) {
                contrib.configure(this.app);
            }
        }
        return new Promise<void>(resolve => {
            const server = this.app.listen(port, () => {
                console.log(`Theia app listening on port ${port}.`)
                resolve();
            });
            for (const contrib of contributions) {
                if (contrib.onStart) {
                    contrib.onStart(server);
                }
            }
        });
    }

}
