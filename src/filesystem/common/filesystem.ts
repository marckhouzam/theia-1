/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Disposable } from '../../application/common';

export const FileSystem = Symbol("FileSystem");

export interface FileSystem extends Disposable {

    /**
     * Returns the filestat for the given uri.
     *
     * If the uri points to a folder it will contain one level of unresolved children.
     */
    getFileStat(uri: string): Promise<FileStat>;

    /**
     *Finds out if a file identified by the resource exists.
     */
    exists(uri: string): Promise<boolean>;

    /**
     * Resolve the contents of a file identified by the resource.
     */
    resolveContent(uri: string, options?: { encoding?: string }): Promise<{ stat: FileStat, content: string }>;

    /**
     * Updates the content replacing its previous value.
     */
    setContent(file: FileStat, content: string, options?: { encoding?: string }): Promise<FileStat>;

    /**
     * Moves the file to a new path identified by the resource.
     *
     * The optional parameter overwrite can be set to replace an existing file at the location.
     */
    move(sourceUri: string, targetUri: string, options?: { overwrite?: boolean }): Promise<FileStat>;

    /**
     * Copies the file to a path identified by the resource.
     *
     * The optional parameter overwrite can be set to replace an existing file at the location.
     */
    copy(sourceUri: string, targetUri: string, options?: { overwrite?: boolean, recursive?: boolean }): Promise<FileStat>;

    /**
     * Creates a new file with the given path. The returned promise
     * will have the stat model object as a result.
     *
     * The optional parameter content can be used as value to fill into the new file.
     */
    createFile(uri: string, options?: { content?: string, encoding?: string }): Promise<FileStat>;

    /**
     * Creates a new folder with the given path. The returned promise
     * will have the stat model object as a result.
     */
    createFolder(uri: string): Promise<FileStat>;

    /**
     * Creates a new empty file if the given path does not exist and otherwise
     * will set the mtime and atime of the file to the current date.
     */
    touchFile(uri: string): Promise<FileStat>;

    /**
     * Deletes the provided file. The optional moveToTrash parameter allows to
     * move the file to trash.
     */
    delete(uri: string, options?: { moveToTrash?: boolean }): Promise<void>;

    /**
     * Allows to start a watcher that reports file change events on the provided resource.
     */
    watchFileChanges(uri: string): Promise<void>;

    /**
     * Allows to stop a watcher on the provided resource or absolute fs path.
     */
    unwatchFileChanges(uri: string): Promise<void>;

    /**
     * Returns the encoding of the given file resource.
     */
    getEncoding(uri: string): Promise<string>;

    /**
     * Returns the workspace root
     */
    getWorkspaceRoot(): Promise<FileStat>;

}

export namespace FileSystem {
    export declare type Configuration = {
        encoding: string,
        recursive: boolean,
        overwrite: boolean,
        moveToTrash: true,
    };
}

export interface FileSystemClient {
    /**
     * Notifies about file changes
     */
    onFileChanges(event: FileChangesEvent): void
}

export class FileChangesEvent {
    constructor(public readonly changes: FileChange[]) { }
}

export class FileChange {

    constructor(
        public readonly uri: string,
        public readonly type: FileChangeType) { }

    equals(other: any): boolean {
        return other instanceof FileChange && other.type === this.type && other.uri === this.uri;
    }

}

export enum FileChangeType {
    UPDATED = 0,
    ADDED = 1,
    DELETED = 2
}


/**
 * A file resource with meta information.
 */
export interface FileStat {

    /**
     * The uri of the file.
     */
    uri: string;

    /**
     * The last modification of this file.
     */
    lastModification: number;

    /**
     * The resource is a directory. Iff {{true}}
     * {{encoding}} has no meaning.
     */
    isDirectory: boolean;

    /**
     * Return {{true}} when this is a directory
     * that is not empty.
     */
    hasChildren?: boolean;

    /**
     * The children of the file stat.
     * If it is undefined and isDirectory is true, then this file stat is unresolved.
     */
    children?: FileStat[];

    /**
     * The size of the file if known.
     */
    size?: number;

}