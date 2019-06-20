export type Message = {
  type: string
  payload: Dict,
  ctx: Dict
}

export type Dict = {
  [key: string]: any
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

export type HandlerResponse = Message|string|void;
export type Handler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => HandlerResponse|Promise<HandlerResponse>;
