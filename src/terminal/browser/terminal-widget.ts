/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Endpoint } from '../../application/common/endpoint';
import { WebSocketConnectionProvider } from '../../messaging/browser';
import { Disposable } from '../../application/common';
import { DisposableCollection } from 'vscode-ws-jsonrpc/lib/disposable';
import { Message } from '@phosphor/messaging/lib';
import { Widget } from '@phosphor/widgets/lib';
import * as Xterm from 'xterm';
import 'xterm/lib/addons/fit/fit';
import 'xterm/lib/addons/attach/attach';

let num = 0

export class TerminalWidget extends Widget implements Disposable {

    private pid: string | undefined
    private term: Xterm
    private cols: number = 80
    private rows: number = 40
    private disposables = new DisposableCollection()
    private endpoint: Endpoint

    constructor(private websocketConnectionProvider: WebSocketConnectionProvider) {
        super()
        this.endpoint = new Endpoint({ path: '/terminals' })
        num++
        this.id = 'terminal-' + num
        this.title.caption = 'Terminal ' + num
        this.title.label = 'Terminal ' + num
        this.title.closable = true
        this.addClass("terminal-container")

        this.term = new Xterm({
            cursorBlink: true,
            theme: 'dark'
        });


        this.term.open(this.node);
        this.term.on('title', (title: string) => {
            this.title.label = title;
        });
        this.registerResize()
        this.startNewTerminal()

        this.disposables.push({ dispose: () => {
            this.term.destroy()
        }})
    }

    protected registerResize() {
        let initialGeometry = (this.term as any).proposeGeometry()
        this.cols = initialGeometry.cols;
        this.rows = initialGeometry.rows;

        this.term.on('resize', size => {
            if (!this.pid) {
                return;
            }
            this.cols = size.cols
            this.rows = size.rows
            let url = this.endpoint.getRestUrl().toString() + "/" + this.pid + '/size?cols=' + this.cols + '&rows=' + this.rows;
            fetch(url, { method: 'POST' })
        });
        (this.term as any).fit()
    }

    protected startNewTerminal() {
        fetch(this.endpoint.getRestUrl().toString() + '?cols=' + this.cols + '&rows=' + this.rows, { method: 'POST' }).then((res) => {
            res.text().then((pid: string) => {
                this.pid = pid;
                let socket = this.createWebSocket(pid);
                socket.onopen = () => {
                    (this.term as any).attach(socket);
                    (this.term as any)._initialized = true
                }
                socket.onclose = () => {
                    this.title.label = `<terminated>`
                };
                socket.onerror = (err) => {
                    console.error(err)
                }
                this.disposables.push({
                    dispose() {
                        socket.close()
                    }
                })
            });
        });
    }

    protected createWebSocket(pid: string): WebSocket {
        const url = this.endpoint.getWebSocketUrl().appendPath(pid)
        return this.websocketConnectionProvider.createWebSocket(url.toString(), { reconnecting: false })
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        super.dispose()
        this.disposables.dispose()
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg)
        this.term.focus()
    }

    protected onCloseRequest(msg: Message): void {
        super.onCloseRequest(msg)
        this.dispose()
    }

    private resizeTimer: any

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        clearTimeout(this.resizeTimer)
        this.resizeTimer = setTimeout(() => {
            this.doResize()
        }, 500)
    }

    private doResize() {
        let geo = (this.term as any).proposeGeometry()
        this.cols = geo.cols
        this.rows = geo.rows - 1 // subtract one row for margin
        this.term.resize(this.cols, this.rows)
    }
}