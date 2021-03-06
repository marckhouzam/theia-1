/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { openSocket } from '../../messaging/node';
import { ExpressContribution } from '../../application/node';
import { getRootDir } from '../../filesystem/node/filesystem-server-module';
import * as express from 'express';
import * as http from 'http';
import { ContainerModule, injectable } from 'inversify';
import URI from "../../application/common/uri";

const pty = require("node-pty")

export default new ContainerModule( bind => {
    bind(ExpressContribution).to(TerminalExpressContribution)
})

@injectable()
class TerminalExpressContribution implements ExpressContribution {
    private terminals: Map<number, any> = new Map()
    private logs: string[] = []

    configure(app: express.Application): void {
        app.post('/terminals', (req, res) => {
            let cols = parseInt(req.query.cols, 10),
                rows = parseInt(req.query.rows, 10),
                term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
                    name: 'xterm-color',
                    cols: cols || 80,
                    rows: rows || 24,
                    cwd: process.env.PWD,
                    env: process.env
                })
            term.write(`cd ${getRootDir()} && `)
            term.write("source ~/.profile\n")

            this.terminals.set(term.pid, term)
            this.logs[term.pid] = '';
            term.on('data', (data: any) => {
                this.logs[term.pid] += data;
            });
            res.send(term.pid.toString());
            res.end();
        });

        app.post('/terminals/:pid/size', (req, res) => {
            let pid = parseInt(req.params.pid, 10),
                cols = parseInt(req.query.cols, 10),
                rows = parseInt(req.query.rows, 10),
                term = this.terminals.get(pid)
            if (term) {
                term.resize(cols, rows);
            } else {
                console.error("Couldn't resize terminal " + pid + ", because it doesn't exist.")
            }
            res.end();
        });
    }

    onStart(server: http.Server): void {
        openSocket({
            server,
            matches: (request) => {
                const uri = new URI(request.url!)
                return uri.path.startsWith('/terminals/')
            }
        }, (ws, request) => {
            const uri = new URI(request.url!)
            const pid = parseInt(uri.lastSegment, 10)
            const term = this.terminals.get(pid)
            if (!term) {
                return;
            }
            term.on('data', (data: any) => {
                try {
                    ws.send(data)
                } catch (ex) {
                    console.error(ex)
                }
            })
            ws.on('message', (msg: any) => {
                term.write(msg)
            })
            ws.on('close', (msg: any) => {
                term.kill()
                this.terminals.delete(pid)
                delete this.logs[pid]
            })
        })
    }
}