import tavern from '../tavern';
import { Message } from '../types';
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

const InvalidRequestError = tavern.createCustomError('InvalidRequestError');

export default class RequestHandler extends tavern.Service {
  handleRequest = async ({ req }: RequestHandlerPayload) => {
    if (req === undefined) {
      return this.error(new InvalidRequestError());
    }

    const parsedRequest = await this.ask('PARSE_REQUEST', { req });
    if (this.isError(parsedRequest)) {
      return parsedRequest;
    }

    const { type, payload, ctx } = parsedRequest.payload as Message;
    const action = { type, payload, ctx: { ...ctx, req } };
    const response = await this.ask(action);
    return this.msg('RESPONSE', response, { request: action });
  }

  subscriptions = {
    'HANDLE_REQUEST': this.handleRequest
  }
}
