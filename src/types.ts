export type Message = {
  type: string
  payload: Dict,
  ctx: Dict
}

export type Dict = {
  [key: string]: any
}