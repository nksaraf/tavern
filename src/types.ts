export type Message = {
  type: string
  payload: Dict,
  ctx: Dict
}

export type Dict = {
  [key: string]: any
}

export { Messenger, Barkeep } from './barkeep';
export { Service, Handler } from './service';
