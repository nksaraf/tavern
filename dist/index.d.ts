/// <reference types="react" />
import { WritableAtom, Atom, PrimitiveAtom } from 'jotai';
export * from 'jotai';
import { SetStateAction, Getter, Setter } from 'jotai/types';
export * from 'ink';


declare const fileAtom: {
    (param: string): WritableAtom<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }, SetStateAction<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }>>;
    remove(param: string): void;
    atoms: [string, WritableAtom<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }, SetStateAction<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }>>][];
};
declare const writeFileAtom: {
    (param: string): WritableAtom<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }, string>;
    remove(param: string): void;
    atoms: [string, WritableAtom<{
        contents: string | undefined;
        status: "empty" | "filled" | "writing" | "written";
    }, string>][];
};
declare const touchedFiles: {};
declare function cleanup(): void;
declare const File: ({ path, children, }: {
    path: string;
    children: string;
}) => JSX.Element;
declare function useFile(path: string): [string, (update?: string) => void | Promise<void>, "empty" | "filled" | "writing" | "written"];

declare type AtomFamily<Param, AtomType> = {
    (param: Param): AtomType;
    remove(param: Param): void;
    atoms: [Param, AtomType][];
};
declare function atomFamily<Param, Value, Update>(initializeRead: (param: Param) => (get: Getter) => Promise<Value>, initializeWrite: (param: Param) => (get: Getter, set: Setter, update: Update) => void | Promise<void>, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, WritableAtom<Value, Update>>;
declare function atomFamily<Param, Value, Update>(initializeRead: (param: Param) => (get: Getter) => Value, initializeWrite: (param: Param) => (get: Getter, set: Setter, update: Update) => void | Promise<void>, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, WritableAtom<Value, Update>>;
declare function atomFamily<Param, Value, Update>(initializeRead: (param: Param) => Function, initializeWrite: (param: Param) => (get: Getter, set: Setter, update: Update) => void | Promise<void>, areEqual?: (a: Param, b: Param) => boolean): never;
declare function atomFamily<Param, Value, Update>(initializeRead: (param: Param) => Value, initializeWrite: (param: Param) => (get: Getter, set: Setter, update: Update) => void | Promise<void>, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, WritableAtom<Value, Update>>;
declare function atomFamily<Param, Value, Update extends never = never>(initializeRead: (param: Param) => (get: Getter) => Promise<Value>, initializeWrite?: null, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, Atom<Value>>;
declare function atomFamily<Param, Value, Update extends never = never>(initializeRead: (param: Param) => (get: Getter) => Value, initializeWrite?: null, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, Atom<Value>>;
declare function atomFamily<Param, Value, Update>(initializeRead: (param: Param) => Function, initializeWrite?: null, areEqual?: (a: Param, b: Param) => boolean): never;
declare function atomFamily<Param, Value, Update extends never = never>(initializeRead: (param: Param) => Value, initializeWrite?: null, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, PrimitiveAtom<Value>>;

declare type PromiseCache = {
    promise: Promise<any>;
    args: any;
    error?: any;
    response?: any;
};
interface PromiseFunction<T, V> {
    (props?: T): Promise<V>;
}
declare function createAsset<T, V>(fn: PromiseFunction<T, V>, lifespan?: number): {
    read: (args: T) => V;
    preload: (args: T) => any;
    clear: (args: T) => void;
    cache: PromiseCache[];
    peek: (args: T) => any;
};
declare function useAsset<T, V>(fn: PromiseFunction<T, V>, args: T): V;
declare namespace useAsset {
    var lifespan: number;
    var clear: (args: any) => void;
    var preload: <T, V>(fn: PromiseFunction<T, V>, args: T) => void;
    var peek: (args: any) => any;
}

declare const wait: (time: any) => Promise<unknown>;
declare const Execution: ({ children }: {
    children: any;
}) => JSX.Element;
declare function App(): JSX.Element;
declare function Env({ children }: {
    children: any;
}): JSX.Element;
declare const TavernProvider: ({ children }: {
    children: any;
}) => JSX.Element;

export default App;
export { Env, Execution, File, PromiseCache, PromiseFunction, TavernProvider, atomFamily, cleanup, createAsset, fileAtom, touchedFiles, useAsset, useFile, wait, writeFileAtom };
