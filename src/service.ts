import { createCustomError, isErrorMessage, makeErrorMessage } from './error';
import { match } from './matcher';
import { Message, Dict, Messenger, makeMessage } from './messenger';

export type HandlerResponse = Message|string|void;
export type Handler = (
  this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger
) => HandlerResponse|Promise<HandlerResponse>

export interface Subscriptions {
  [pattern: string]: Handler | Handler[]
}

export interface Service {
  subscriptions: Subscriptions
}

const NotRegisteredError = createCustomError('NotRegisteredError');

export abstract class Service implements Messenger {
  subscriptions: Subscriptions = {};
  msg = makeMessage;
  isError = isErrorMessage;
  match = match;
  error = makeErrorMessage as (error: Error|string, status?: number, ctx?: object) => Message;

  async ask(message: Message|string|void, payload?: object, ctx?: object) {
    return makeErrorMessage(NotRegisteredError());
  }

  tell(message: Message|string|void, payload?: object, ctx?: object) {
    return makeErrorMessage(NotRegisteredError());
  }

  throw(error: Error|string, status?: number, ctx?: object) {
    return makeErrorMessage(NotRegisteredError());
  }
}
