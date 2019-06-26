import _ from 'lodash';
import { validate, argError } from './utils';
import glob from './glob';
import { CompleteMessage } from './speaker';
import code from './status_codes';

export interface NamedError<T extends string> extends Error {
  name: T;
  status: number;
  ctx: object;
}

export function createError<T extends string>(
  name: T,
  status: number = code.INTERNAL_SERVER_ERROR
) {
  validate(name, 'string', 'name');
  const baseStatus = validate(
    status,
    'number',
    'status',
    code.INTERNAL_SERVER_ERROR
  );

  const errorConstructor = (message = name, ctx = {}, status = baseStatus) => {
    const error = new Error(validate(message, 'string', 'message', name));
    status = validate(status, 'number', 'status', baseStatus);
    ctx = Object.assign({}, validate(ctx, 'object', 'ctx', {}));

    const customError: NamedError<T> = Object.assign(error, {
      name,
      status,
      ctx
    });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(customError, errorConstructor);
    }
    return customError;
  };

  errorConstructor.prototype = new Error();
  return errorConstructor;
}

export const isError = glob('*ERROR');

export const TavernError = createError('TavernError');

export const makeErrorMessage = <T extends string>(
  error: Error | NamedError<T> | string,
  status = 400,
  ctx: object = {}
): CompleteMessage => {
  if (error === undefined) throw argError('error', error, 'Error|string');
  if (typeof error === 'string') {
    return makeErrorMsgFromString(error, status, ctx);
  }
  if (validate(error, 'object', 'error')) {
    return makeErrorMsgFromError(error, status, ctx);
  }
  throw argError('error', error, 'Error|string');
};

const makeErrorMsgFromString = (
  error: string,
  status?: number,
  ctx?: object
) => ({
  type: 'ERROR',
  payload: {
    error: validate(error, 'string', 'error'),
    status: validate(status, 'number', 'status', code.INTERNAL_SERVER_ERROR)
  },
  ctx: Object.assign({}, validate(ctx, 'object', 'ctx', {}))
});

const makeErrorMsgFromError = <T extends string>(
  error: Error | NamedError<T>,
  status: number,
  ctx: object
) => ({
  type: _.snakeCase(
    validate(error.name, 'string', 'error.name', 'ERROR')
  ).toUpperCase(),
  payload: {
    error: validate(error.message, 'string', 'error.message'),
    status: validate(
      (error as NamedError<T>).status,
      'number',
      'error.status',
      validate(status, 'number', 'status', code.INTERNAL_SERVER_ERROR)
    )
  },
  ctx: Object.assign(
    {},
    validate(ctx, 'object', 'ctx', {}),
    validate((error as NamedError<T>).ctx, 'object', 'error.ctx', {})
  )
});
