import { Messenger, MessengerApi, MockMessenger } from './barkeep';
import { makeErrorMessage, TavernError, createCustomError } from './error';
import { Message, Dict } from './types';
import mixin from 'merge-descriptors';

type ResponseVariants = Message|string|void;
type HandlerResponse = ResponseVariants|Promise<ResponseVariants>;
export type Handler = (this: MessengerApi|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => HandlerResponse;

export type StrictHandlerResponse = Promise<Message|string|undefined>;
export type StrictHandler = (this: MessengerApi|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => StrictHandlerResponse;

export type Subscriptions = {
  [pattern: string] : Handler
}

export interface Service {
  subscriptions: Subscriptions
}

export interface ServiceGenerator {
  (): Service|Subscriptions
}

export interface ServiceConstructor {
  new (): Service|Subscriptions
}

const NotRegisteredError = createCustomError('NotRegisteredError');

class BaseMessenger implements MessengerApi {
  barkeep: Messenger;

  ask = MockMessenger.ask;
  tell = MockMessenger.tell;
  throw = MockMessenger.throw;
  listen = MockMessenger.listen;
  msg = MockMessenger.msg;
  isError = MockMessenger.isError;
  error = MockMessenger.error;
  match = MockMessenger.match;

  constructor() {
    this.barkeep = {
      msg: this.msg,
      isError: this.isError,
      error: this.error,
      match: this.match,
      ask: this.ask.bind(this),
      tell: this.tell.bind(this),
      throw: this.throw.bind(this),
      listen: this.listen.bind(this)
    }
  }
}


export abstract class BaseService extends BaseMessenger implements Service  {
  abstract subscriptions: Subscriptions;
}
