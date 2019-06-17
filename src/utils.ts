import { Message } from './types';
import _ from 'lodash';
import multimatch from 'multimatch';

export function makeMessage(
    message: Message|string|undefined,
    payload : object = {}, 
    ctx: object = {}
  ): Message|undefined {

  if (message === undefined) return undefined;

  if (_.isString(message)) {
    return { 
      type: message.toUpperCase(), 
      payload: Object.assign({}, checkArgType(payload, 'object', 'payload', {})), 
      ctx: Object.assign({}, checkArgType(ctx, 'object', 'ctx', {}))
    };
  } else if (_.isString(message.type)) {
    return {
      type: message.type.toUpperCase(),
      payload: Object.assign({}, payload, checkArgType(message.payload, 'object', 'message.payload', {})),
      ctx: Object.assign({}, ctx, checkArgType(message.ctx, 'object', 'message.ctx', {})),
    };
  } else {
    throwTypeError('message', message, 'object|string');
  }
}

export function match(message: Message|string, pattern: string|string[]): boolean {
  if (message === undefined) {
    return false;
  }

  if (_.isString(message)) {
    return multimatch(message.toUpperCase(), pattern).length > 0;
  } else if (checkArgType(message, 'object', 'message') && checkArgType(message.type, 'string', 'message.type')) {
    return multimatch(message.type.toUpperCase(), pattern).length > 0;
  }
  return false;
}

export function createMatcher(pattern: string|string[]) {
  return (message: Message|string) => match(message, pattern);
}

export function isConstructor(object: any): boolean {
  try {
    new object();
  } catch (err) {
    if (err.message.indexOf('is not a constructor') >= 0) {
      return false;
    }
  }
  return true;
}

function isSimpleObject(value: any) {
  return _.isObjectLike(value) && !(_.isArrayLikeObject(value));
}

const checkers: { [key: string]: (value?: any) => boolean } = {
  object: isSimpleObject, 
  number: _.isNumber,
  string: _.isString,
  message: ({ type, payload, ctx }) => _.isString(type) && isSimpleObject(payload) && isSimpleObject(ctx),
  function: _.isFunction
}

export function throwTypeError(arg: string, value: any, type: string) : never {
  throw new TypeError(`${arg}=${value} is not of type: ${type}`)
}

export function checkArgType<T>(value: T, type: string, arg: string, def?: T) : T {
  if (!(_.isString(type) && type in checkers)) {
    throw new Error(`type=${type} is not one of ${Object.keys(checkers).map(a => `'${a}'`).join(', ')}`);
  }

  if (!(_.isString(arg))) throwTypeError('arg', arg, 'string');

  if(_.isUndefined(value)) {
    if (checkers[type](def)) {
      return (def as T);
    } else {
      throw new TypeError(`${arg} cannot be undefined (no default value)`);
    }
  } else if (checkers[type](value)) {
    return value;
  } else {
    throwTypeError(arg, value, type);
  }

  return (def as T);
}