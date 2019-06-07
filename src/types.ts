import { MessengerApi, Messenger } from './barkeep';

export type Message = {
  type: string
  payload: object,
  ctx: object
}