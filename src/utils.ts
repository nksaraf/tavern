// @ts-check

import { CustomError, CustomErrorClass } from './types';

/**
 * Create an Error class with the given name, can be used to
 * get better logging messages.
 * @param name Name of error class
 * @return Custom error class
 */
const createCustomError = <C extends string>(name: C) : CustomErrorClass<C> => {
  function createError(this: Error, message: string, status = 400, ctx = {}) : CustomError<C> {
    const error = new Error(message);
    const customError: CustomError<C> = Object.assign(error, { name, status, ctx });
    Object.setPrototypeOf(customError, Object.getPrototypeOf(this));
    if (Error.captureStackTrace) {
      Error.captureStackTrace(customError, createError);
    }
    return customError;
  }

  const ErrorClass = Object.setPrototypeOf(
    {}, 
    Object.create(Error.prototype, {
      constructor: {
        value: createError,
        enumerable: false,
        writable: true,
        configurable: true
      }
    }
   ));

  return ErrorClass;
};

export { createCustomError };
