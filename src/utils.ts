import _ from 'lodash';

const isNonArrayObject = (value: any) =>
  _.isObjectLike(value) && !_.isArrayLikeObject(value);

const validators: { [key: string]: (value?: any) => boolean } = {
  object: isNonArrayObject,
  number: _.isNumber,
  string: _.isString,
  message: ({ type, payload, ctx }) =>
    _.isString(type) && isNonArrayObject(payload) && isNonArrayObject(ctx),
  function: _.isFunction
};

export const argError = (arg: string, value: any, type: string) =>
  new TypeError(`${arg}=${value} is not of type: ${type}`);

export function validate<T>(value: T, type: string, arg: string, def?: T): T {
  if (!_.isString(type) || !(type in validators)) {
    throw argError(
      'type',
      type,
      `string {${Object.keys(validators).join(', ')}}`
    );
  } else if (!_.isString(arg)) {
    throw argError('arg', arg, 'string');
  }

  if (validators[type](value)) {
    return value;
  }

  if (_.isUndefined(value)) {
    if (validators[type](def)) {
      return def as T;
    }
    throw new TypeError(`${arg} cannot be undefined (no default value)`);
  }

  throw argError(arg, value, type);
  return def as T;
}
