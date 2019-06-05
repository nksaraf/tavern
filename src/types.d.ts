export type Message = {
  type: string,
  payload: object,
  ctx: object
}

type HandlerResponse = Message | string | undefined | Promise<Message | string | undefined>;

export interface MessengerHelpers {
  msg?: (message: Message | string | undefined, payload?: object, ctx?: object) => Message | undefined,
  isError?: (message: Message) => boolean,
  match?: (message: string | Message, pattern: string | string[]) => boolean,
  error?: <T extends string>(error: Error | string | CustomError<T>, status?: number, ctx?: object) => Message
}

export interface MessengerApi {
  ask?: (this: MessengerApi, message: Message | string | undefined, payload?: object, ctx?: object) => Message,
  tell?: (this: MessengerApi, message: Message | string | undefined, payload?: object, ctx?: object) => Message
  throw?: (this: MessengerApi, error: string | Error, status?: number, ctx?: object) => Message
  listen?: (this: MessengerApi) => void,
}

export interface Messenger extends MessengerApi, MessengerHelpers {
  barkeep: MessengerApi & MessengerHelpers;
}

export interface Registrar {
  register: (this: Registrar, service: any) => Registrar
  use: (this: Registrar, pattern: string, handler: Handler, options: any) => Registrar
}

export interface Handler {
  (this: Messenger | undefined, payload: object, ctx: object, type: string, barkeep: Messenger): HandlerResponse,
}

interface Subscriptions {
  [pattern: string] : Handler
}

export interface ServiceSubscriptions {
  subscriptions: Subscriptions
}

export interface ServiceGenerator {
  (): Service;
}

export interface ServiceConstructor {
  new (): Service;
}

export interface ServiceObject {
  [pattern: string]: Handler
}

export type Service = ServiceSubscriptions | ServiceConstructor | ServiceGenerator | ServiceObject

export interface CustomError<T extends string> extends Error {
  name: T;
  status: number;
  ctx: object;
}

export interface CustomErrorClass<T extends string> {
  new (message: string, status?: number, ctx?: object): CustomError<T>
}

export interface Matchers {
  [pattern: string]: string[]
}

export interface Listeners {
  [pattern: string]: Handler[]
}
