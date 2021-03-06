/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as http from 'http';
import { ContainerModule, injectable, inject, named } from "inversify";
import { ExpressContribution } from '../../application/node';
import { openSocket, toIWebSocket } from '../../messaging/node';
import { WebSocketMessageReader, WebSocketMessageWriter, ConnectionHandler, JsonRpcProxyFactory } from "../../messaging/common";
import { createConnection } from "vscode-ws-jsonrpc/lib/server";
import { LanguageContribution } from "./language-contribution";
import { bindExtensionProvider, ExtensionProvider } from '../../application/common/extension-provider';
import { LANGUAGES_PATH, LanguagesService, LanguageIdentifier } from "../common";

export const nodeLanguagesModule = new ContainerModule(bind => {
    bind(ExpressContribution).to(LanguagesExpressContribution).inSingletonScope();
    bind(LanguagesService).to(LanguagesServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => {
        const languagesService = ctx.container.get(LanguagesService);
        return new JsonRpcProxyFactory<LanguagesService>(LANGUAGES_PATH, languagesService);
    }).inSingletonScope();
    bindExtensionProvider(bind, LanguageContribution)
});

@injectable()
export class LanguagesExpressContribution implements ExpressContribution {

    constructor(
        @inject(ExtensionProvider) @named(LanguageContribution) protected readonly contributors: ExtensionProvider<LanguageContribution>
    ) {
    }

    onStart(server: http.Server): void {
        for (const contribution of this.contributors.getExtensions()) {
            const path = LanguageIdentifier.create(contribution.description).path;
            openSocket({
                server,
                path
            }, s => {
                const socket = toIWebSocket(s)
                const reader = new WebSocketMessageReader(socket);
                const writer = new WebSocketMessageWriter(socket);
                const connection = createConnection(reader, writer, () => socket.dispose());
                contribution.listen(connection);
            });
        }
    }

}

@injectable()
export class LanguagesServiceImpl implements LanguagesService {

    constructor(
        @inject(ExtensionProvider) @named(LanguageContribution) protected readonly contributors: ExtensionProvider<LanguageContribution>) { }

    getLanguages(): Promise<LanguageIdentifier[]> {
        return Promise.resolve(
            this.contributors.getExtensions().map(contribution =>
                LanguageIdentifier.create(contribution.description)
            )
        )
    }

}
