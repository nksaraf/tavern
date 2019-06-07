import { BaseService, Message } from '../tavern';

interface RequestHandlerPayload {
  req: any
}

export default class RequestHandler extends BaseService {
  handleRequest = async ({ req }: RequestHandlerPayload) => {
    const parsedRequest = await this.barkeep.ask('PARSE_REQUEST', { req });
    if (this.isError(parsedRequest)) {
      return parsedRequest;
    }

    const { type, payload, ctx } = parsedRequest.payload as Message;
    const action = { type, payload, ctx: { ...ctx, req } };
    const response = await this.barkeep.ask(action);
    return this.msg('RESPONSE', response, { request: action });
  }

  subscriptions = {
    'HANDLE_REQUEST': this.handleRequest
  }
}
