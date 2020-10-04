import { Atom, atom, PrimitiveAtom, WritableAtom } from "jotai";
import { Getter, Setter } from "jotai/types";
import deepEqual from "fast-deep-equal";

type AtomFamily<Param, AtomType> = {
  (param: Param): AtomType;
  remove(param: Param): void;
  atoms: [Param, AtomType][];
};

// async-read writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => (get: Getter) => Promise<Value>,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value, Update>>;

// writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => (get: Getter) => Value,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value, Update>>;

// invalid writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Function,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): never;

// write-only derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Value,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value, Update>>;

// async-read read-only derived atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => (get: Getter) => Promise<Value>,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, Atom<Value>>;

// read-only derived atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => (get: Getter) => Value,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, Atom<Value>>;

// invalid read-only derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Function,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): never;

// primitive atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => Value,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, PrimitiveAtom<Value>>;

export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => any,
  initializeWrite?: null | ((param: Param) => any),
  areEqual: (a: Param, b: Param) => boolean = deepEqual
) {
  type AtomType = WritableAtom<Value, Update>;
  const atoms: [Param, AtomType][] = [];
  const createAtom = (param: Param) => {
    const found = atoms.find((x) => areEqual(x[0], param));
    if (found) {
      return found[1];
    }
    const newAtom = atom(
      initializeRead(param),
      initializeWrite && initializeWrite(param)
    ) as AtomType;
    atoms.unshift([param, newAtom]);
    return newAtom;
  };
  createAtom.remove = (p: Param) => {
    const index = atoms.findIndex((x) => x[0] === p);
    if (index >= 0) {
      atoms.splice(index, 1);
    }
  };
  createAtom.atoms = atoms;
  return createAtom;
}
