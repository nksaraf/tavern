import { throwTypeError, checkArgType } from '../src/utils.ts';
import { makeMessage } from '../src/messenger.ts';

const msg = (type, payload, ctx) => ({ type, payload, ctx });

describe('helper msg function', () => {
  test('with (type, payload, ctx)', () => {
    expect(msg('A', { a: 1 }, { b: 1 })).toEqual({ type: 'A', payload: { a: 1 }, ctx: { b: 1 } });
  });
});

describe('make message', () => {
  test('with ()', () => {
    expect(makeMessage()).toBeUndefined();
  });

  test('with (message: invalid, ...) throws', () => {
    expect(() => makeMessage(null)).toThrow();
    expect(() => makeMessage(1)).toThrow();
    expect(() => makeMessage(1, { a: 1 }, { b: 1 })).toThrow();
    expect(() => makeMessage({})).toThrow();
    expect(() => makeMessage({ _type: 'HELLO' })).toThrow();
  });

  test('with (message: string)', () => {
    expect(makeMessage('HELLO')).toEqual(msg('HELLO', {}, {}));
  });

  test('with (message: string, payload, ctx)', () => {
    expect(makeMessage('HELLO', { a: 1 }, { b: 1 })).toEqual(msg('HELLO', { a: 1 }, { b: 1 }));
  });

  test('with (message: string, payload: invalid, ...) throws', () => {
    expect(() => makeMessage('HELLO', 1, { a: 1 })).toThrow();
    expect(() => makeMessage('HELLO', null)).toThrow();
    expect(() => makeMessage('HELLO', 'payload')).toThrow();
    expect(() => makeMessage('HELLO', ['a'], { a: 1 })).toThrow();
  });

  test('with (message: string, payload, ctx: invalid) throws', () => {
    expect(() => makeMessage('HELLO', {}, null)).toThrow();
    expect(() => makeMessage('HELLO', {}, 1)).toThrow();
    expect(() => makeMessage('HELLO', {}, 'payload')).toThrow();
    expect(() => makeMessage('HELLO', {}, ['a'])).toThrow();
  });

  test('with (message: { type: string })', () => {
    expect(makeMessage({ type: 'HELLO' })).toEqual(msg('HELLO', {}, {}));
  });

  test('with (message: { type: invalid })', () => {
    expect(() => makeMessage({ type: null })).toThrow();
  });


  test('with (message: { type, payload, ctx })', () => {
    expect(makeMessage({ type: 'HELLO', payload: { a: 1 }, ctx: { b: 1 } })).toEqual(msg('HELLO', { a: 1 }, { b: 1 }));
  });

  test('with (message: { type, __extras__ }) ignores __extras__', () => {
    expect(makeMessage({ type: 'HELLO', a: 1 })).toEqual(msg('HELLO', {}, {}));
  });

  test('with (message: { type, payload }, payload) merges', () => {
    expect(makeMessage({ type: 'HELLO', payload: { a: 1 } }, { b: 1 })).toEqual(msg('HELLO', { a: 1, b: 1 }, {}));
  });

  test('with (message: { type, payload: invalid }, ...) throws', () => {
    expect(() => makeMessage({ type: 'HELLO', payload: null })).toThrow();
    expect(() => makeMessage({ type: 'HELLO', payload: 1 }, { a: 1 })).toThrow();
    expect(() => makeMessage({ type: 'HELLO', payload: 'string' })).toThrow();
  });

  test('with (message: { type }, payload)', () => {
    expect(makeMessage({ type: 'HELLO' }, { b: 1 })).toEqual(msg('HELLO', { b: 1 }, {}));
  });

  test('with (message: { type, payload }, payload) keep original while merging', () => {
    expect(makeMessage({ type: 'HELLO', payload: { b: 1 } }, { b: 2 })).toEqual(msg('HELLO', { b: 1 }, {}));
  });

  test('with (message: { type, ctx }, ctx) merges', () => {
    expect(makeMessage({ type: 'HELLO', ctx: { a: 1 } }, undefined, { b: 1 })).toEqual(msg('HELLO', {}, { a: 1, b: 1 }));
  });

  test('with (message: { type, ctx: invalid }, ...) throws', () => {
    expect(() => makeMessage({ type: 'HELLO', ctx: null })).toThrow();
    expect(() => makeMessage({ type: 'HELLO', ctx: 1 }, {}, { a: 1 })).toThrow();
    expect(() => makeMessage({ type: 'HELLO', ctx: 'string' })).toThrow();
  });

  test('with (message: { type }, ctx)', () => {
    expect(makeMessage({ type: 'HELLO' }, undefined, { b: 1 })).toEqual(msg('HELLO', {}, { b: 1 }));
  });

  test('with (message: { type, ctx }, ctx) keep original while merging', () => {
    expect(makeMessage({ type: 'HELLO', ctx: { b: 1 } }, undefined, { b: 2 })).toEqual(msg('HELLO', {}, { b: 1 }));
  });
});

describe('throw type error', () => {
  test('with (arg, value, type) throws', () => {
    expect(() => throwTypeError('name', 1, 'string')).toThrow('name=1 is not of type: string');
  });
});

describe('check arg type', () => {
  test('with (value: valid, arg: string)', () => {
    expect(checkArgType(1, 'number', 'a', 0)).toBe(1);
    expect(checkArgType('a', 'string', 'a', 'a')).toBe('a');
    expect(checkArgType({ a: 1 }, 'object', 'a', {})).toEqual({ a: 1 });
    expect(checkArgType(msg('A', { a: 1 }, { b: 1 }), 'message', 'a')).toEqual(msg('A', { a: 1 }, { b: 1 }));
    expect(checkArgType(() => null, 'function', 'a')()).toBeNull();
    expect(checkArgType(Error, 'function', 'a')()).toBeTruthy();
  });

  test('with (value: undefined, default: undefined) throws', () => {
    expect(() => checkArgType(undefined, 'number', 'a')).toThrow();
  });

  test('with (value: undefined, default: valid)', () => {
    expect(checkArgType(undefined, 'number', 'a', 1)).toBe(1);
    expect(checkArgType(undefined, 'object', 'a', {})).toEqual({});
    expect(checkArgType(undefined, 'string', 'a', 'hello')).toBe('hello');
    expect(checkArgType(undefined, 'message', 'a', msg('A', { a: 1 }, { b: 1 }))).toEqual(msg('A', { a: 1 }, { b: 1 }));
    expect(checkArgType(undefined, 'function', 'a', () => 'hello')()).toBe('hello');
  });

  test('with (value: undefined, default: invalid) throws', () => {
    expect(() => checkArgType(undefined, 'number', 'a', 'hello')).toThrow();
    expect(() => checkArgType(undefined, 'object', 'a', 1)).toThrow();
    expect(() => checkArgType(undefined, 'string', 'a', 1)).toThrow();
    expect(() => checkArgType(undefined, 'message', 'a', 1)).toThrow();
    expect(() => checkArgType(undefined, 'function', 'a', {})).toThrow();
  });

  test('with (type: invalid) throws', () => {
    expect(() => checkArgType('a', 'blah', 'a')).toThrow();
    expect(() => checkArgType('a', 1, 'a')).toThrow();
    expect(() => checkArgType('a', null, 'a')).toThrow();
  });

  test('with (arg: invalid) throws', () => {
    expect(() => checkArgType('a', 'string', 1)).toThrow();
    expect(() => checkArgType('a', 'string', {})).toThrow();
  });

  test('with (value: invalid, type=string) throws', () => {
    expect(() => checkArgType(null, 'string', 'a', 'a')).toThrow();
    expect(() => checkArgType(1, 'string', 'a', 'a')).toThrow();
    expect(() => checkArgType({ a: 1 }, 'string', 'a', 'a')).toThrow();
    expect(() => checkArgType(['a'], 'string', 'a', 'a')).toThrow();
    expect(() => checkArgType(() => 'hello', 'string', 'a', 'a')).toThrow();
  });

  test('with (value: invalid, type=number) throws', () => {
    expect(() => checkArgType(null, 'number', 'a', 'a')).toThrow();
    expect(() => checkArgType('a', 'number', 'a', 'a')).toThrow();
    expect(() => checkArgType({ a: 1 }, 'number', 'a', 'a')).toThrow();
    expect(() => checkArgType(['a'], 'number', 'a', 'a')).toThrow();
    expect(() => checkArgType(() => 'hello', 'number', 'a', 'a')).toThrow();
  });

  test('with (value: invalid, type=object) throws', () => {
    expect(() => checkArgType(null, 'object', 'a', 'a')).toThrow();
    expect(() => checkArgType('a', 'object', 'a', 'a')).toThrow();
    expect(() => checkArgType(1, 'object', 'a', 'a')).toThrow();
    expect(() => checkArgType(['a'], 'object', 'a', 'a')).toThrow();
    expect(() => checkArgType(() => 'hello', 'object', 'a', 'a')).toThrow();
  });

  test('with (value: invalid, type=message) throws', () => {
    expect(() => checkArgType(null, 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType('a', 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType(1, 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType(['a'], 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType({ type: 'A' }, 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType({ type: 'A', payload: {} }, 'message', 'a', 'a')).toThrow();
    expect(() => checkArgType(() => 'hello', 'message', 'a', 'a')).toThrow();
  });

  test('with (value: invalid, type=function) throws', () => {
    expect(() => checkArgType(null, 'function', 'a', 'a')).toThrow();
    expect(() => checkArgType('a', 'function', 'a', 'a')).toThrow();
    expect(() => checkArgType(1, 'function', 'a', 'a')).toThrow();
    expect(() => checkArgType(['a'], 'function', 'a', 'a')).toThrow();
    expect(() => checkArgType({ a: 1 }, 'function', 'a', 'a')).toThrow();
  });
});
