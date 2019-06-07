import { Messenger, MessengerApi } from './barkeep';
import { makeErrorMessage, TavernError } from './error';
import { Message } from './types';

type ResponseVariants = void | Message | string | undefined;
type HandlerResponse = ResponseVariants | Promise<ResponseVariants>;
export type Handler = (this: MessengerApi | any, payload: any, ctx: any, type: string, barkeep: Messenger) => HandlerResponse;

export type StrictHandlerResponse = Promise<Message | string | undefined>;
export type StrictHandler = (this: MessengerApi | any, payload: any, ctx: any, type: string, barkeep: Messenger) => StrictHandlerResponse;

export type Subscriptions = {
  [pattern: string] : Handler
}

export interface Service {
  subscriptions: Subscriptions
}

export interface ServiceGenerator {
  (): Service | Subscriptions
}

export interface ServiceConstructor {
  new (): Service | Subscriptions
}

class BaseMessenger implements MessengerApi {
  barkeep: Messenger;
  msg = (message: any): any => { throw new TavernError('No implementation') }
  isError = (message: any): any => { throw new TavernError('No implementation') }
  error = makeErrorMessage
  match = (message: any, pattern: any): any => { throw new TavernError('No implementation') }
  ask = (message: any): any => { throw new TavernError('No implementation') }
  tell = (message: any): any => { throw new TavernError('No implementation') }
  throw = (message: any): any => { throw new TavernError('No implementation') }
  listen = (): any => { throw new TavernError('No implementation') }

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
