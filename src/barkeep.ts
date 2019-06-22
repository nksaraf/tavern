import _ from 'lodash';

import { TavernError } from './error';
import { Messenger, Message, Dict } from './messenger';
import Registrar, { AsyncHandler } from './registrar';

interface TransformFunc {
  (response: Message): any
}

interface CollectFunc {
  (responses: any[]): Message | undefined
}

interface ListenerOptions extends Dict {
  init?: boolean
}

export interface Listener {
  listen: (this: Listener, options?: Dict) => Promise<void>
}

enum AskMode {
  ALL = 'all',
  ONE = 'one'
}

interface AskCtx extends Dict {
  mode?: AskMode | string
  transform?: TransformFunc
  collect?: CollectFunc
}

interface AskOptions {
  mode: AskMode | string
  transform: TransformFunc
  collect: CollectFunc
}

//export default interface Barkeep extends Registrar, Messenger, Listener { }

export default class Barkeep extends Registrar implements Messenger, Listener {

  private async askHandler(request: Message, handler: AsyncHandler): Promise<Message|undefined> {
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
      if (!(response.ctx.private)) {
        this.tell(response);
      }
    }
    return response;
  }

  private async askAll(
    request: Message,
    handlers: AsyncHandler[],
    { transform, collect }: AskOptions
  ): Promise<Message|undefined> {
    const responses = [];
    try {
      for (let i = 0; i < handlers.length; i += 1) {
        const response = await this.askHandler(request, handlers[i]);
        if (response !== undefined) {
          responses.push(transform(response));
        }
      }
      return this.tell(collect(responses), undefined, request.ctx);
    } catch (error) {
      return this.throw(error, undefined, request.ctx);
    }
  }

  private async askOne(
    request: Message,
    handlers: AsyncHandler[],
    { transform }: AskOptions
  ): Promise<Message|undefined> {
    // TODO: add way to define what proper response is (throught context fields)
    let finalResponse: Message|undefined;
    let i;
    for (i = 0; i < handlers.length; i += 1) {
      const response = await this.askHandler(request, handlers[i]);
      if (response !== undefined) {
        finalResponse = transform(response);
        break;
      }
    }

    _.slice(handlers, i + 1).forEach((handler) => this.askHandler(request, handler));
    return finalResponse;
  }

  async ask(
    message: Message|string|void,
    payload: object = {},
    ctx: AskCtx = {}
  ): Promise<Message> {
    const request = this.msg(message, payload, ctx);

    if (request === undefined) {
      return this.throw(TavernError('Invalid message to ask'));
    }

    const matchedSubscriptions = this.getSubscriptions(request);
    const handlers = _.flatten(_.values(matchedSubscriptions));

    const options: AskOptions = _.defaults({ ...request.ctx }, {
      transform: _.identity,
      collect: (messages: any[]) => this.msg('COLLECTED_RESPONSES', { responses: messages }, request.ctx),
      mode: AskMode.ONE
    });

    let response;
    if (options.mode === AskMode.ONE) {
      response = await this.askOne(request, handlers, options);
    } else if (options.mode === AskMode.ALL) {
      response = await this.askAll(request, handlers, options);
    }

    if (response === undefined) {
      return this.throw(TavernError('No response found'), 404, { ...request.ctx, request: request.type });
    }

    response.ctx.request = request.type;
    return response;
  }

  private async tellAsync(message: Message) : Promise<void> {
    const matchedSubscriptions = this.getSubscriptions(message);
    const handlers = _.flatten(_.values(matchedSubscriptions));

    for (let i = 0; i < handlers.length; i += 1) {
      handlers[i](message.payload, message.ctx, message.type, this.messenger);
    }
  }

  tell(message: Message|string|void, payload: object = {}, ctx: object = {}) : Message {
    const event = this.msg(message, payload, ctx);
    if (event === undefined) {
      return this.error(TavernError('Invalid message to tell'));
    } else {
      this.tellAsync(event);
      return event;
    }
  }

  throw(error: Error|string, status: number = 400, ctx: object = {}) : Message {
    return this.tell(
      this.error(error, status, ctx)
    );
  }

  async listen({ init }: ListenerOptions = {}) {
    if (init) {
      const results = await this.ask('INIT', undefined, {
        mode: 'all',
        transform: (message) => !(this.isError(message)),
        collect: (responses: boolean[]) => this.msg('INIT_RESULT', { result: responses.every((value) => value)})
      });
      if (!results.payload.result) {
        this.throw(TavernError('Init failed'));
        return;
      }
    }
    this.tell('LISTEN');
  }
}

// TODO: Plugins API
