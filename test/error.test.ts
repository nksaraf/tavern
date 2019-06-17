// @ts-ignore
import _ from 'lodash';
import { createCustomError, makeErrorMessage, TavernError, isErrorMessage } from '../src/error';

describe('create custom error', () => {
  test('with (name: string)', () => {
    const CustomError = createCustomError('CustomError');
    expect((new CustomError()).name).toBe('CustomError');
    expect(_.isError(new CustomError())).toBeTruthy();
    expect(() => { throw new CustomError('error!!!!!'); }).toThrow('error!!!!!');
  });

  test('with (name: invalid) throws', () => {
    expect(() => createCustomError(1)).toThrow();
    expect(() => createCustomError(null)).toThrow();
    expect(() => createCustomError({})).toThrow();
    expect(() => createCustomError()).toThrow();
  });
});

const obj = (error) => ({
  name: error.name,
  message: error.message,
  status: error.status,
  ctx: error.ctx
});

const e = (type, error, status, ctx) => ({
  type,
  payload: { error, status },
  ctx
});

describe('custom error constructor', () => {
  const CustomError = createCustomError('CustomError');

  test('with ())', () => {
    expect(obj(new CustomError())).toEqual({
      name: 'CustomError',
      message: 'CustomError',
      status: 400,
      ctx: {}
    });
  });

  test('with (message: string)', () => {
    expect(obj(new CustomError('hello'))).toEqual({
      name: 'CustomError',
      message: 'hello',
      status: 400,
      ctx: {}
    });
  });

  test('with (message: invalid) throws', () => {
    expect(() => new CustomError(null)).toThrow();
    expect(() => new CustomError(1)).toThrow();
  });

  test('with (message, status: number)', () => {
    expect(obj(new CustomError('hello', 200))).toEqual({
      name: 'CustomError',
      message: 'hello',
      status: 200,
      ctx: {}
    });
  });

  test('with (message, status: invalid) throws', () => {
    expect(() => new CustomError('hello', null)).toThrow();
    expect(() => new CustomError('hello', 'a')).toThrow();
  });

  test('with (message, status, ctx: object)', () => {
    expect(obj(new CustomError('hello', 200, { a: 1 }))).toEqual({
      name: 'CustomError',
      message: 'hello',
      status: 200,
      ctx: { a: 1 }
    });
  });

  test('with (message, status, ctx: invalid)', () => {
    expect(() => new CustomError('hello', 200, null)).toThrow();
    expect(() => new CustomError('hello', 200, 'a')).toThrow();
    expect(() => new CustomError('hello', 200, 1)).toThrow();
  });
});

describe('tavern error', () => {
  test('has correct name', () => {
    expect((new TavernError()).name).toBe('TavernError');
  });
});

describe('make error message', () => {
  test('with (error: invalid) throws', () => {
    expect(() => makeErrorMessage(null)).toThrow();
    expect(() => makeErrorMessage(1)).toThrow();
    expect(() => makeErrorMessage({})).toThrow();
  });

  describe('for (error: string)', () => {
    test('with (error)', () => {
      expect(makeErrorMessage('Hello')).toEqual(e('ERROR', 'Hello', 400, {}));
    });

    test('with (error, status: number)', () => {
      expect(makeErrorMessage('Hello', 200)).toEqual(e('ERROR', 'Hello', 200, {}));
    });

    test('with (error, status: invalid) throws', () => {
      expect(() => makeErrorMessage('Hello', 'a')).toThrow();
      expect(() => makeErrorMessage('Hello', null)).toThrow();
      expect(() => makeErrorMessage('Hello', {})).toThrow();
    });

    test('with (error, status, ctx: object)', () => {
      expect(makeErrorMessage('Hello', 200, { a: 1 })).toEqual(e('ERROR', 'Hello', 200, { a: 1 }));
    });

    test('with (error, status, ctx: invalid) throws', () => {
      expect(() => makeErrorMessage('Hello', 200, 'a')).toThrow();
      expect(() => makeErrorMessage('Hello', 200, null)).toThrow();
      expect(() => makeErrorMessage('Hello', 200, 1)).toThrow();
    });
  });

  describe('for (error: Error)', () => {
    test('with (error)', () => {
      expect(makeErrorMessage(new Error('Hello'))).toEqual(e('ERROR', 'Hello', 400, {}));
    });

    test('with (error: TypeError)', () => {
      expect(makeErrorMessage(new TypeError('Hello'))).toEqual(e('TYPE_ERROR', 'Hello', 400, {}));
    });

    test('with (error, status: number)', () => {
      expect(makeErrorMessage(new Error('Hello'), 200)).toEqual(e('ERROR', 'Hello', 200, {}));
    });

    test('with (error, status: invalid) throws', () => {
      expect(() => makeErrorMessage(new Error('Hello'), 'a')).toThrow();
      expect(() => makeErrorMessage(new Error('Hello'), null)).toThrow();
      expect(() => makeErrorMessage(new Error('Hello'), {})).toThrow();
    });

    test('with (error, status, ctx: object)', () => {
      expect(makeErrorMessage(new Error('Hello'), 200, { a: 1 })).toEqual(e('ERROR', 'Hello', 200, { a: 1 }));
    });

    test('with (error, status, ctx: invalid) throws', () => {
      expect(() => makeErrorMessage(new Error('Hello'), 200, 'a')).toThrow();
      expect(() => makeErrorMessage(new Error('Hello'), 200, null)).toThrow();
      expect(() => makeErrorMessage(new Error('Hello'), 200, 1)).toThrow();
    });
  });

  describe('for (error: CustomError)', () => {
    test('with (error)', () => {
      expect(makeErrorMessage(new TavernError('Hello'))).toEqual(e('TAVERN_ERROR', 'Hello', 400, {}));
    });

    test('with (error: { status, ctx })', () => {
      expect(makeErrorMessage(new TavernError('Hello', 200, { a: 1 }))).toEqual(e('TAVERN_ERROR', 'Hello', 200, { a: 1 }));
    });

    test('with (error: { status }, status ) use original while merging', () => {
      expect(makeErrorMessage(new TavernError('Hello', 100), 200)).toEqual(e('TAVERN_ERROR', 'Hello', 100, {}));
    });

    test('with (error: { status, ctx }, ctx) merges', () => {
      expect(makeErrorMessage(new TavernError('Hello', 100, { a: 1 }), undefined, { b: 1 }))
        .toEqual(e('TAVERN_ERROR', 'Hello', 100, { a: 1, b: 1 }));
    });

    test('with (error: { status, ctx }, ctx) user original while merging', () => {
      expect(makeErrorMessage(new TavernError('Hello', 100, { a: 1 }), undefined, { a: 2 }))
        .toEqual(e('TAVERN_ERROR', 'Hello', 100, { a: 1 }));
    });
  });
});

describe('is error', () => {
  test('with string', () => {
    expect(isErrorMessage('HELLO')).toBe(false);
    expect(isErrorMessage('ERROR')).toBe(true);
    expect(isErrorMessage('TAVERNERROR')).toBe(true);
    expect(isErrorMessage('TAVERN_ERROR')).toBe(true);
    expect(isErrorMessage('tavern_error')).toBe(true);
    expect(isErrorMessage('')).toBe(false);
    expect(isErrorMessage()).toBe(false);
  });

  test('with message', () => {
    expect(isErrorMessage({ type: 'HELLO' })).toBe(false);
    expect(isErrorMessage({ type: 'ERROR' })).toBe(true);
    expect(isErrorMessage({ type: 'ERROR', payload: {}, ctx: {} })).toBe(true);
    expect(isErrorMessage({ type: 'tavern_error', payload: {}, ctx: {} })).toBe(true);
  });

  test('with invalid message throws', () => {
    expect(() => isErrorMessage({})).toThrow();
  });

  test('with invalid throws', () => {
    expect(() => isErrorMessage(null)).toThrow();
  });
});
