import _ from 'lodash';
import mixin from 'merge-descriptors';

import { isConstructor, checkArgType } from './utils';
import { Matcher, match, GlobPattern } from './matcher';
import { makeErrorMessage, isErrorMessage, TavernError } from './error';
import { Messenger, Message, Dict, makeMessage } from './messenger';
import { Subscriptions, Service, Handler, HandlerResponse } from './service';

interface ServiceGenerator {
  (): Service|Subscriptions
}

interface ServiceConstructor {
  new (): Service|Subscriptions
}

type Subscriber = Service | Subscriptions | ServiceConstructor | ServiceGenerator;

interface AsyncSubscriptions extends Subscriptions {
  [pattern: string]: AsyncHandler | AsyncHandler[]
}

type MessagePattern = (AsyncHandler | AsyncHandler[]) & Matcher;

interface RegistrarSubscriptions extends AsyncSubscriptions {
  [pattern: string]: MessagePattern
}

type AsyncHandler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => Promise<HandlerResponse>;

interface Registrar extends Service {
  register: (this: Registrar, ...services: Subscriber[]) => Registrar
  use: (this: Registrar, pattern: string, handler: Handler, options?: UseOptions) => Registrar
  getSubscriptions: (this: Registrar, message: Message|string) => AsyncSubscriptions
  subscriptions: AsyncSubscriptions
}

interface Listener {
  listen: (this: Listener) => Message
}

interface WrapHandlerOptions {
  setThisToBarkeep?: boolean
}

interface UseOptions extends WrapHandlerOptions {
  logSubscription?: boolean
}

export default interface Barkeep extends Registrar, Messenger, Listener { }

export default class Barkeep implements Barkeep {
  subscriptions: RegistrarSubscriptions = {};
  msg = makeMessage;
  match = match;
  error = makeErrorMessage;
  isError = isErrorMessage;
  private messenger: Messenger;

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

  constructor() {
    this.messenger = {
      ask: this.ask.bind(this),
      tell: this.tell.bind(this),
      throw: this.throw.bind(this),
      msg: makeMessage,
      match: this.match,
      error: this.error,
      isError: this.isError
    };
  }

  throw(error: Error|string, status: number = 400, ctx: object = {}) : Message {
    return this.tell(
      this.error(error, status, ctx)
    );
  }

  listen() {
    return this.tell('LISTEN');
  }

  getSubscriptions(message: string|Message): AsyncSubscriptions {
    checkArgType(message, 'message', 'message');
    return _.pickBy(this.subscriptions, (value, key) => value.match(message));
  }

  use(pattern: string, handlers: Handler | Handler[], options: UseOptions = {}) : Registrar {
    if (_.isArray(handlers)) {
      _.forEach(handlers, (handler) => this.use(pattern, handler, options));
      return this;
    }

    const handler = handlers as Handler;

    try {
      checkArgType(pattern, 'string', 'pattern');
      checkArgType(options, 'object', 'options');
      checkArgType(handler, 'function', 'handler');
    } catch (error) {
      this.throw(error);
      throw error;
    }

    const defaultOptions = {
      logSubscription: true,
      setThisToBarkeep: true
    }

    const args: UseOptions = _.defaults(options, defaultOptions);
    const wrappedHandler = this.wrapHandler(handler, this.messenger, args);

    pattern = pattern.toUpperCase();
    if (!(pattern in this.subscriptions)) {
      const messagePattern: AsyncHandler[] = [];
      const subscription = Object.assign(messagePattern, new GlobPattern(pattern));
      this.subscriptions[pattern] = subscription;
    }

    if (_.isArray(this.subscriptions[pattern])) {
      (this.subscriptions[pattern] as AsyncHandler[]).push(wrappedHandler);
    } else {
      const newMessagePattern = [(this.subscriptions[pattern] as AsyncHandler), wrappedHandler];
      const subscription = Object.assign(newMessagePattern, this.subscriptions[pattern] as Matcher);
      this.subscriptions[pattern] = subscription;
    }

    if (args.logSubscription) {
      this.tell('SUBSCRIBED', { patterns: [pattern] });
    }
    return this;
  }

  register(...services: Subscriber[]) {
    for (let i = 0; i < services.length; i += 1) {
      this.registerService(services[i]);
    }
    return this;
  }

  private bindHandlersToSubscriber(handlers: Handler | Handler[], subscriber: Subscriber) {
    if (_.isArray(handlers)) {
      return _.map(handlers, (handler) => handler.bind(subscriber));
    } else {
      return (handlers as Handler).bind(subscriber);
    }
  }

  private registerService(subscriber: Subscriber) {
    if (isConstructor(subscriber)) {
      const ServiceClass = (subscriber as ServiceConstructor);
      this.registerService(new ServiceClass());

    } else if (_.isFunction(subscriber)) {
      this.registerService((subscriber as ServiceGenerator)());

    } else if (_.isPlainObject(subscriber)) {
      const subscriptions = (subscriber as Subscriptions);
      for (const pattern of Object.keys(subscriptions)) {
        const boundHandlers = this.bindHandlersToSubscriber(subscriptions[pattern], subscriber);
        this.use(
          pattern,
          boundHandlers,
          { setThisToBarkeep: false, logSubscription: false }
        );
      }
      this.tell('SUBSCRIBED', { patterns: Object.keys(subscriber) });
      mixin(subscriber, this.messenger);
    } else {
      const service = subscriber as Service;
      checkArgType(service.subscriptions, 'object', 'service.subscriptions');
      mixin(service, this.messenger);
      for (const pattern of Object.keys(service.subscriptions)) {
        const boundHandlers = this.bindHandlersToSubscriber(service.subscriptions[pattern], subscriber);
        this.use(
          pattern,
          boundHandlers,
          { setThisToBarkeep: false, logSubscription: false }
        );
      }
      const name = service.constructor ? service.constructor.name : null;
      this.tell('SUBSCRIBED', { patterns: Object.keys(service.subscriptions), name });
    }
  }

  private wrapHandler(func: Handler, barkeep: Messenger, options: WrapHandlerOptions = {}) : AsyncHandler {
    const defaultOptions = {
      setThisToBarkeep: false
    };

    const args: WrapHandlerOptions = _.defaults(options, defaultOptions);

    return async (payload: object, ctx: object, type: string) => {
      const that = args.setThisToBarkeep ? barkeep : undefined;
      const handled = func.call(that, payload, ctx, type, barkeep);
      if (handled === undefined) {
        return undefined;
      } else {
        return (handled as Promise<HandlerResponse>);
      }
    }
  }
}
