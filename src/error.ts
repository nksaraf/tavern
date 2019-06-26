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
  validate.string(name, 'name');
  const baseStatus = validate.number(
    status,
    'status',
    code.INTERNAL_SERVER_ERROR
  );

  const errorConstructor = (
    message: string = name,
    ctx = {},
    status = baseStatus
  ) => {
    const error = new Error(validate.string(message, 'message', name));
    const mixin = {
      name,
      status: validate.number(status, 'status', baseStatus),
      ctx: Object.assign({}, validate.object(ctx, 'ctx', {}))
    };
    const namedError: NamedError<T> = Object.assign(error, mixin);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(namedError, errorConstructor);
    }
    return namedError;
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
  if (validate.object(error, 'error')) {
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
    error: validate.string(error, 'error'),
    status: validate.number(status, 'status', code.INTERNAL_SERVER_ERROR)
  },
  ctx: Object.assign({}, validate.object(ctx, 'ctx', {}))
});

const makeErrorMsgFromError = <T extends string>(
  error: Error | NamedError<T>,
  status: number,
  ctx: object
) => ({
  type: _.snakeCase(
    validate.string(error.name, 'error.name', 'ERROR')
  ).toUpperCase(),
  payload: {
    error: validate.string(error.message, 'error.message'),
    status: validate.number(
      (error as NamedError<T>).status,
      'error.status',
      validate.number(status, 'status', code.INTERNAL_SERVER_ERROR)
    )
  },
  ctx: Object.assign(
    {},
    validate.object(ctx, 'ctx', {}),
    validate.object((error as NamedError<T>).ctx, 'error.ctx', {})
  )
});
