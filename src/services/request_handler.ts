import { BaseService, Message, Dict, createCustomError } from '../index';
import http from 'http';

interface RequestHandlerPayload {
  req?: {
    path: string; 
    method: string;
    body?: object;
    query?: object;
    headers?: http.IncomingHttpHeaders;
  }
}

const InvalidRequestError = createCustomError('InvalidRequestError');

export default class RequestHandler extends BaseService {
  handleRequest = async ({ req }: RequestHandlerPayload) => {
    if (req === undefined) {
      return this.error(new InvalidRequestError());
    }

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
