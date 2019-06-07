import { Message } from './types';
import _ from 'lodash';

export interface CustomError<T extends string> extends Error {
  name: T;
  status: number;
  ctx: object;
}

// interface CustomErrorConstructor<T extends string> {
//   new (message: string, status?: number, ctx?: object): CustomError<T>;
// } 

// interface CustomErrorConstructor<T extends string> {};

/**
 * Create an Error class with the given name, can be used to
 * get better logging messages.
 * @param name Name of error class
 * @return Custom error class
 */
export function createCustomError<T extends string>(name: T) : any {
  function CustomError(this: Error, message: string, status = 400, ctx = {}) : CustomError<T> {
    const error = new Error(message);
    const customError: CustomError<T> = Object.assign(error, { name, status, ctx });
    Object.setPrototypeOf(customError, Object.getPrototypeOf(this));
    if (Error.captureStackTrace) {
      Error.captureStackTrace(customError, CustomError);
    }
    return customError;
  }

  CustomError.prototype = Object.create(Error.prototype, {
    constructor: {
      value: Error,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  return CustomError;
};

export const TavernError = createCustomError('TavernError');

export function makeErrorMessage<T extends string>(
    error: Error | string | CustomError<T>, 
    status = 400, 
    ctx: object = {}
  ): Message {
  let errorName;
  let errorMessage;
  let errorStatus;
  let errorCtx;

  if (typeof error === 'string') {
    errorName = 'ERROR';
    errorMessage = error;
    errorStatus = status;
    errorCtx = ctx;
  } else {
    const { name, message } = error;
    errorName = name;
    errorMessage = message;
    errorStatus = (error as CustomError<T>).status || status;
    errorCtx = Object.assign({}, ctx, (error as CustomError<T>).ctx);
  }

  return {
    type: _.snakeCase(errorName).toUpperCase(),
    payload: { error: errorMessage, status: errorStatus },
    ctx: errorCtx,
  };
}