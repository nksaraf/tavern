import { Messenger } from './barkeep';
import { makeErrorMessage, createCustomError, isErrorMessage } from './error';
import { match, makeMessage } from './utils';
import { Message, Dict } from './types';

type ResponseVariants = Message|string|void;
type HandlerResponse = ResponseVariants|Promise<ResponseVariants>;

export type Handler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => HandlerResponse;

export type StrictHandlerResponse = Promise<Message|string|undefined>;
export type StrictHandler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => StrictHandlerResponse;

export type Subscriptions = {
  [pattern: string] : Handler
}

export interface Subscriber {
  subscriptions: Subscriptions
}

export interface ServiceGenerator {
  (): Subscriber|Subscriptions
}

export interface ServiceConstructor {
  new (): Subscriber|Subscriptions
}

export type Service = Subscriber | Subscriptions | ServiceConstructor | ServiceGenerator;

const NotRegisteredError = createCustomError('NotRegisteredError');

export abstract class BaseService implements Subscriber, Messenger {
  abstract subscriptions: Subscriptions;
  msg = makeMessage;
  isError = isErrorMessage;
  match = match;
  error = makeErrorMessage;
  ask =  async (message: Message|string|undefined, payload?: object, ctx?: object) => makeErrorMessage(new NotRegisteredError());
  tell = (message: Message|string|undefined, payload?: object, ctx?: object) => makeErrorMessage(new NotRegisteredError());
  throw = (error: Error|string, status?: number, ctx?: object) => makeErrorMessage(new NotRegisteredError());
}
