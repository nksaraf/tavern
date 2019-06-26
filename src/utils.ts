import _ from 'lodash';

function isObjectNotArray(value: any): boolean {
  return _.isObjectLike(value) && !_.isArrayLikeObject(value);
}

const typeCheckers: { [key: string]: (value?: any) => boolean } = {
  object: isObjectNotArray,
  number: _.isNumber,
  string: _.isString,
  message: ({ type, payload, ctx }) =>
    _.isString(type) && isObjectNotArray(payload) && isObjectNotArray(ctx),
  function: _.isFunction
};

const allTypesRepr = Object.keys(typeCheckers)
  .map(a => `'${a}'`)
  .join(', ');

export const typeError = (arg: string, value: any, type: string) =>
  new TypeError(`${arg}=${value} is not of type: ${type}`);

export function assertType<T>(value: T, type: string, arg: string, def?: T): T {
  if (!_.isString(type) || !(type in typeCheckers)) {
    throw typeError('type', type, `string {${allTypesRepr}}`);
  } else if (!_.isString(arg)) {
    throw typeError('arg', arg, 'string');
  }

  if (typeCheckers[type](value)) {
    return value;
  }

  if (_.isUndefined(value)) {
    if (typeCheckers[type](def)) {
      return def as T;
    }
    throw new TypeError(`${arg} cannot be undefined (no default value)`);
  }

  throw typeError(arg, value, type);
  return def as T;
}
