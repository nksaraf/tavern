import _ from 'lodash';

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

const typeCheckers: { [key: string]: (value?: any) => boolean } = {
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
  if (!(_.isString(type) && type in typeCheckers)) {
    throw new Error(`type=${type} is not one of ${Object.keys(typeCheckers).map(a => `'${a}'`).join(', ')}`);
  }

  if (!(_.isString(arg))) throwTypeError('arg', arg, 'string');

  if(_.isUndefined(value)) {
    if (typeCheckers[type](def)) {
      return (def as T);
    } else {
      throw new TypeError(`${arg} cannot be undefined (no default value)`);
    }
  } else if (typeCheckers[type](value)) {
    return value;
  } else {
    throwTypeError(arg, value, type);
  }

  return (def as T);
}
