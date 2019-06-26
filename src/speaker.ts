import _ from 'lodash';
import { validate, argError } from './utils';

export type Dict = {
  [key: string]: any;
};

export type Message = {
  type: string;
  payload?: Dict;
  ctx?: Dict;
};

export type CompleteMessage = {
  type: string;
  payload: Dict;
  ctx: Dict;
};

const makeMessageFromString = (
  message: string,
  payload: object = {},
  ctx: object = {}
) => ({
  type: validate.string(message, 'message').toUpperCase(),
  payload: Object.assign({}, validate.object(payload, 'payload')),
  ctx: Object.assign({}, validate.object(ctx, 'ctx'))
});

const makeMessageFromObject = (
  message: Message,
  payload: object = {},
  ctx: object = {}
) => ({
  type: validate.string(message.type, 'message.type').toUpperCase(),
  payload: Object.assign(
    {},
    payload,
    validate.object(message.payload, 'message.payload', {})
  ),
  ctx: Object.assign({}, ctx, validate.object(message.ctx, 'message.ctx', {}))
});

export function makeMessage(
  message: Message | string | void,
  payload: object = {},
  ctx: object = {}
): CompleteMessage | undefined {
  if (message === undefined) return undefined;
  if (message === null) throw argError('message', message, 'message|string');
  return _.isString(message)
    ? makeMessageFromString(message, payload, ctx)
    : makeMessageFromObject(message, payload, ctx);
}

export interface Speaker {
  ask: (
    this: Speaker,
    message: Message | string | void,
    payload?: object,
    ctx?: object
  ) => Promise<CompleteMessage>;

  tell: (
    this: Speaker,
    message: Message | string | void,
    payload?: object,
    ctx?: object
  ) => CompleteMessage;

  throw: (
    this: Speaker,
    error: Error | string,
    status?: number,
    ctx?: object
  ) => CompleteMessage;
  error: (
    error: Error | string,
    status?: number,
    ctx?: object
  ) => CompleteMessage;
  msg: (
    message: Message | string | void,
    payload?: object,
    ctx?: object
  ) => Message | undefined;
  isError: (message: Message | string) => boolean;
}
