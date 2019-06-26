import { createError, isError, makeErrorMessage } from './error';
import { match } from './glob';
import {
  Message,
  Dict,
  Speaker,
  makeMessage,
  CompleteMessage
} from './speaker';

export type Response = Message | string | void;

export type Handler = (
  this: Speaker | any,
  payload: Dict,
  ctx: Dict,
  type: string,
  barkeep: Speaker
) => Response | Promise<Response>;

export interface Subscriptions {
  [pattern: string]: Handler | Handler[];
}

export interface Subscriber {
  subscriptions: Subscriptions;
}

const NotRegistered = createError('NotRegistered');

export abstract class Service implements Speaker, Subscriber {
  subscriptions: Subscriptions = {};

  msg = makeMessage;

  isError = isError;

  error = makeErrorMessage as (
    error: Error | string,
    status?: number,
    ctx?: object
  ) => CompleteMessage;

  async ask(message: Message | string | void, payload?: object, ctx?: object) {
    return makeErrorMessage(NotRegistered());
  }

  tell(message: Message | string | void, payload?: object, ctx?: object) {
    return makeErrorMessage(NotRegistered());
  }

  throw(error: Error | string, status?: number, ctx?: object) {
    return makeErrorMessage(NotRegistered());
  }
}
