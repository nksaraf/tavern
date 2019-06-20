import _ from 'lodash';

import { TavernError } from './error';
import { Messenger, Message } from './messenger';
import Registrar, { AsyncHandler } from './registrar';

interface Listener {
  listen: (this: Listener) => Message
}

//export default interface Barkeep extends Registrar, Messenger, Listener { }

export default class Barkeep extends Registrar implements Messenger, Listener {
  private async askRemainingHandlers(request: Message, handlers: AsyncHandler[], index: number): Promise<void> {
    for (let i = index; i < handlers.length; i += 1) {
      const { payload, ctx, type } = request;
      const handlerResponse = handlers[i](payload, ctx, type, this.messenger);
      if (handlerResponse) {
        (handlerResponse).then((response) => this.tell(response, undefined, request.ctx));
      }
    }
  }

  async ask(
    message: Message|string|void,
    payload: object = {},
    ctx: object = {}
  ): Promise<Message> {
    const request = this.msg(message, payload, ctx);
    if (request === undefined) {
      return this.throw(TavernError('Invalid message to ask'));
    }

    const matchedSubscriptions = this.getSubscriptions(request);
    const handlers = _.flatten(_.values(matchedSubscriptions));

    let finalResponse: Message|undefined;
    let i;
    for (i = 0; i < handlers.length; i += 1) {
      const handler = handlers[i];
      let response;
      try {
        response = this.msg(
          await handler(request.payload, request.ctx, request.type, this.messenger),
          undefined,
          request.ctx
        );
      } catch (error) {
        response = this.error(error, undefined, request.ctx);
      }
      if (response !== null && response !== undefined) {
        // TODO: add way to define what proper response is (throught context fields)
        // TODO: add way to merge resposnes, different ask workflow
        // TODO: transformers implementation
        // TODO: plugins api
        finalResponse = response;
        if (!(finalResponse.ctx.private)) {
          this.tell(finalResponse);
        }
        break;
      }
    }

    this.askRemainingHandlers(request, handlers, i + 1);

    if (finalResponse === undefined) {
      return this.throw(TavernError('No response found'), 404, request.ctx);
    }
    finalResponse.ctx.request = request.type;
    return finalResponse;
  }

  private async asyncTell(message: Message) : Promise<void> {
    const matchedSubscriptions = this.getSubscriptions(message);
    const handlers = _.flatten(_.values(matchedSubscriptions));

    for (let i = 0; i < handlers.length; i += 1) {
      const { payload, ctx, type } = message;
      handlers[i](payload, ctx, type, this.messenger);
    }
  }

  /**
   * Tells all the subscribed listeners about the given message asyncronously
   * and returns the same message to further be returned to answer requests.
   *
   * @param   message Type of the message or the whole {@link Message}
   * @param   [payload]  Payload of the message
   * @param   [ctx]      Context associated with the message
   * @returns same
   */
  tell(message: Message|string|void, payload: object = {}, ctx: object = {}) : Message {
    const event = this.msg(message, payload, ctx);
    if (event === undefined) {
      return this.error(TavernError('Invalid message to tell'));
    } else {
      this.asyncTell(event);
      return event;
    }
  }

  throw(error: Error|string, status: number = 400, ctx: object = {}) : Message {
    return this.tell(
      this.error(error, status, ctx)
    );
  }

  listen() {
    return this.tell('LISTEN');
  }
}
