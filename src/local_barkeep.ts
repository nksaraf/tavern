import _ from 'lodash';

import { AbstractBarkeep } from './barkeep';
import { TavernError } from './error';
import { Message } from './utils';
import { StrictHandler } from './service';

// interface AskRequestCtx {
//   z?: boolean
//   [key: string]: any
// }

export default class LocalBarkeep extends AbstractBarkeep {
  private async askRemainingHandlers(request: Message, handlers: StrictHandler[], index: number): Promise<void> {
    for (let i = index; i < handlers.length; i += 1) {
      const { payload, ctx, type } = request;
      const handlerResponse = handlers[i](payload, ctx, type, this.api);
      if (handlerResponse) {
        (handlerResponse).then((response) => this.tell(response, undefined, request.ctx));
      }
    }
  }

  /**
   * Ask for a response to given message from available services
   * @param  message Type of the message or the whole {@link Message}
   * @param  [payload] Payload of the message
   * @param  [ctx]     Context associated with the message
   * @return  Response from services
   */
  async ask(
      message: Message|string|undefined,
      payload: object = {},
      ctx: object = {}
    ): Promise<Message> {
    const request = this.msg(message, payload, ctx);
    if (request === undefined) {
      return this.throw(new TavernError('Invalid message to ask'));
    }

    const handlers = this.getHandlers(request);

    let finalResponse: Message|undefined;
    let i;
    for (i = 0; i < handlers.length; i += 1) {
      const handler = handlers[i];
      let response;
      try {
        response = this.msg(
          await handler(request.payload, request.ctx, request.type, this.api),
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
      return this.throw(new TavernError('No response found'), 404, request.ctx);
    }
    finalResponse.ctx.request = request.type;
    return finalResponse;
  }


  private async asyncTell(message: Message) : Promise<void> {
    const handlers = this.getHandlers(message);
    for (let i = 0; i < handlers.length; i += 1) {
      const { payload, ctx, type } = message;
      handlers[i](payload, ctx, type, this.api);
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
  tell(message: Message|string|undefined, payload: object = {}, ctx: object = {}) : Message {
    const event = this.msg(message, payload, ctx);
    if (event === undefined) {
      return this.error(new TavernError('Invalid message to tell'));
    } else {
      this.asyncTell(event);
      return event;
    }
  }
}
