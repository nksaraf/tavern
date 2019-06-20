import { Message, Dict } from './types';
import { createCustomError, isErrorMessage, makeErrorMessage } from './error';
import { match } from './matcher';
import { makeMessage } from './utils';

export interface Messenger {
  ask: (this: Messenger, message: Message|string|void, payload?: object, ctx?: object) => Promise<Message>
  tell: (this: Messenger, message: Message|string|void, payload?: object, ctx?: object) => Message
  throw: (this: Messenger, error: Error|string, status?: number, ctx?: object) => Message
  error: (error: Error|string, status: number, ctx: object) => Message
  msg: (message: Message|string|void, payload?: object, ctx?: object) => Message | undefined
  match: (message: Message|string, pattern: string) => boolean
  isError: (message: Message|string) => boolean
}

export type HandlerResponse = Message|string|void;
export type Handler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => HandlerResponse|Promise<HandlerResponse>

export interface Subscriptions {
  [pattern: string]: Handler | Handler[]
}

export interface Service {
  subscriptions: Subscriptions
}

const NotRegisteredError = createCustomError('NotRegisteredError');

export abstract class Service implements Service, Messenger {
  subscriptions: Subscriptions = {};
  msg = makeMessage;
  isError = isErrorMessage;
  match = match;
  error = makeErrorMessage as (error: Error|string, status?: number, ctx?: object) => Message;
  ask =  async (message: Message|string|void, payload?: object, ctx?: object) => makeErrorMessage(NotRegisteredError());
  tell = (message: Message|string|void, payload?: object, ctx?: object) => makeErrorMessage(NotRegisteredError());
  throw = (error: Error|string, status?: number, ctx?: object) => makeErrorMessage(NotRegisteredError());
}
