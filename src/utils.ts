import _ from 'lodash';
import { createError } from './error';

const InvalidArgument = createError('InvalidArgument');

export const argError = (arg: string, value: any, type: string) =>
  InvalidArgument(`${arg}=${value} is not of type: ${type}`);

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

export const validate: {
  [key: string]: <T>(value: T | undefined, name: string, def?: T) => T;
} = {};

for (let type in validators) {
  validate[type] = <T>(value: T | undefined, name: string = 'arg', def?: T) => {
    if (!(typeof name === 'string')) {
      throw argError('name', name, 'string');
    }

    if (validators[type](value)) {
      return value as T;
    }

    if (_.isUndefined(value)) {
      if (validators[type](def)) {
        return def as T;
      }
      throw new TypeError(`${name} cannot be undefined (no default value)`);
    }

    throw argError(name, value, type);
    return def as T;
  };
}
