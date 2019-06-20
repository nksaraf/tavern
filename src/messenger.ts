import _ from 'lodash';
import { checkArgType, throwTypeError } from './utils';

export type Message = {
  type: string
  payload: Dict,
  ctx: Dict
}

export type Dict = {
  [key: string]: any
}

export function makeMessage(
    msg: Message|string|void,
    payload : object = {},
    ctx: object = {}
  ): Message|undefined {

  if (msg === undefined) return undefined;
  else if (msg === null) throwTypeError('msg', msg, 'message|string');

  if (_.isString(msg)) {
    return {
      type: msg.toUpperCase(),
      payload: Object.assign({}, checkArgType(payload, 'object', 'payload', {})),
      ctx: Object.assign({}, checkArgType(ctx, 'object', 'ctx', {}))
    };
  }

  const message = msg as Message;
  if (_.isString(message.type)) {
    return {
      type: message.type.toUpperCase(),
      payload: Object.assign({}, payload, checkArgType(message.payload, 'object', 'message.payload', {})),
      ctx: Object.assign({}, ctx, checkArgType(message.ctx, 'object', 'message.ctx', {})),
    };
  } else {
    throwTypeError('message', message, 'object|string');
  }
}

export interface Messenger {
  ask: (this: Messenger, message: Message|string|void, payload?: object, ctx?: object) => Promise<Message>
  tell: (this: Messenger, message: Message|string|void, payload?: object, ctx?: object) => Message
  throw: (this: Messenger, error: Error|string, status?: number, ctx?: object) => Message
  error: (error: Error|string, status: number, ctx: object) => Message
  msg: (message: Message|string|void, payload?: object, ctx?: object) => Message | undefined
  match: (message: Message|string, pattern: string) => boolean
  isError: (message: Message|string) => boolean
}
