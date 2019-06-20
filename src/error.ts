import _ from 'lodash';
import { checkArgType, throwTypeError } from './utils';
import { createMatcher } from './matcher';
import { Message } from './types';

export interface CustomError<T extends string> extends Error {
  name: T;
  status: number;
  ctx: object;
}

interface CustomErrorFunction<T extends string> {
  (message?: string, status?: number, ctx?: object): CustomError<T>;
}

/**
 * Create an Error class with the given name, can be used to
 * get better logging messages.
 * @param name Name of error class
 * @return Custom error class
 */
export function createCustomError<T extends string>(name: T) : CustomErrorFunction<T> {
  checkArgType(name, 'string', 'name');

  function CustomError(message: string = name, status = 400, ctx = {}) : CustomError<T> {
    const error = new Error(checkArgType(message, 'string', 'message', name));
    const errorStatus = checkArgType(status, 'number', 'status', 400);
    const errorCtx = Object.assign({}, checkArgType(ctx, 'object', 'ctx', {}));

    const customError: CustomError<T> = Object.assign(error, { name, status: errorStatus, ctx: errorCtx });
    if (Error.captureStackTrace) {
      Error.captureStackTrace(customError, CustomError);
    }
    return customError;
  }
  CustomError.prototype = new Error();
  return CustomError;
};

export function makeErrorMessage<T extends string>(
    error: Error|CustomError<T>|string,
    status = 400,
    ctx: object = {}
  ): Message {

  let errorName;
  let errorMessage;
  let errorStatus;
  let errorCtx;

  if (error === undefined) throwTypeError('error', error, 'Error|string');
  status = checkArgType(status, 'number', 'status', 400);
  ctx = checkArgType(ctx, 'object', 'ctx', {});

  if (_.isString(error)) {
    errorName = 'ERROR';
    errorMessage = error;
    errorStatus = status;
    errorCtx = Object.assign({}, ctx);
  } else if (_.isString(error.message)) {
    errorName = checkArgType(error.name, 'string', 'error.name', 'ERROR');
    errorMessage = checkArgType(error.message, 'string', 'error.message');
    errorStatus = checkArgType((error as CustomError<T>).status, 'number', 'error.status', status);
    errorCtx = Object.assign({}, ctx, checkArgType((error as CustomError<T>).ctx, 'object', 'error.ctx', {}));
  } else {
    throwTypeError('error', error, 'Error|string');
  }

  return {
    type: _.snakeCase(errorName).toUpperCase(),
    payload: { error: errorMessage, status: errorStatus },
    ctx: (errorCtx as object),
  };
}

export const isErrorMessage = createMatcher('*ERROR');

export const TavernError = createCustomError('TavernError');
