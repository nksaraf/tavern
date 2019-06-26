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
  type: validate(message, 'string', 'message').toUpperCase(),
  payload: Object.assign({}, validate(payload, 'object', 'payload', {})),
  ctx: Object.assign({}, validate(ctx, 'object', 'ctx', {}))
});

const makeMessageFromObject = (
  message: Message,
  payload: object = {},
  ctx: object = {}
) => ({
  type: validate(message.type, 'string', 'message.type').toUpperCase(),
  payload: Object.assign(
    {},
    payload,
    validate(message.payload, 'object', 'message.payload', {})
  ),
  ctx: Object.assign(
    {},
    ctx,
    validate(message.ctx, 'object', 'message.ctx', {})
  )
});

export function makeMessage(
  message: Message | string | void,
  payload: object = {},
  ctx: object = {}
): CompleteMessage | undefined {
  if (message === undefined) return undefined;
  if (message === null) throw argError('message', message, 'message|string?');
  return _.isString(message)
    ? makeMessageFromString(message, payload, ctx)
    : makeMessageFromObject(message, payload, ctx);
}

export interface Talker {
  ask: (
    this: Talker,
    message: Message | string | void,
    payload?: object,
    ctx?: object
  ) => Promise<CompleteMessage>;

  tell: (
    this: Talker,
    message: Message | string | void,
    payload?: object,
    ctx?: object
  ) => CompleteMessage;

  throw: (
    this: Talker,
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
