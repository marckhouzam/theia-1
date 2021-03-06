/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import { LanguageContribution, IConnection, createServerProcess, forward } from "../../node";

export type ConfigurationType = 'config_win' | 'config_mac' | 'config_linux';
export const configurations = new Map<typeof process.platform, ConfigurationType>();
configurations.set('darwin', 'config_mac');
configurations.set('win32', 'config_win');
configurations.set('linux', 'config_linux');


/**
 * IF you have python on your machine, `pyls` can be installed with the following command:
 * `pip install `
 */
@injectable()
export class PythonContribution implements LanguageContribution {

    readonly description = {
        id: 'python',
        name: 'Python',
        documentSelector: ['python'],
        fileEvents: [
            '**/*.py'
        ]
    }

    listen(clientConnection: IConnection): void {
        const command = 'pyls';
        const args: string[] = [
        ];
        try {
            const serverConnection = createServerProcess(this.description.name, command, args);
            forward(clientConnection, serverConnection);
        } catch (err) {
            console.error(err)
            console.error("Error starting python language server.")
            console.error("Please make sure it is installed on your system.")
            console.error("Use the following command: 'pip install https://github.com/palantir/python-language-server/archive/master.zip'")
        }
    }

}
