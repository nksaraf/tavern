import mixin from 'merge-descriptors';
import multimatch from 'multimatch';
import _ from 'lodash';

import { Message } from './types';
import { Handler, StrictHandler, StrictHandlerResponse, Service, ServiceGenerator, ServiceConstructor, Subscriptions } from './service';
import { createCustomError, CustomError, TavernError, makeErrorMessage } from './error';

interface MessengerHelpers {
  msg: (message: Message|string|undefined, payload?: object, ctx?: object) => Message|undefined,
  isError: (message: Message|string) => boolean,
  match: (message: Message|string, pattern: string|string[]) => boolean,
  error: <T extends string>(error: Error|CustomError<T>|string, status?: number, ctx?: object) => Message
}

interface CoreMessenger {
  ask: (this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object) => Promise<Message>,
  tell: (this: Messenger, message:Message|string|undefined, payload?: object, ctx?: object) => Message
  throw: (this: Messenger, error: Error|string, status?: number, ctx?: object) => Message
  listen: (this: Messenger) => void,
}

export interface Messenger extends MessengerHelpers, CoreMessenger { }

export interface MessengerApi extends Messenger {
  barkeep: Messenger;
}

type ServiceInput = Service | Subscriptions | ServiceConstructor | ServiceGenerator;

export interface Registrar {
  register: (this: Registrar, ...services: ServiceInput[]) => Registrar
  use: (this: Registrar, pattern: string, handler: Handler, options: UseOptions) => Registrar
}

export type Barkeep = Registrar & Messenger;

// /**
//  * Resolve which of the @code{response} to reply to the service which
//  * sent this @code{message}
//  * @private
//  * @param  {Message[]}  responses
//  * @param  {Message}    message
//  * @return {Message}
//  */
// const findResponseToMessage = (responses: Message[], message: Message) => {
//   if (responses.length === 1) {
//     return responses[0];
//   }
//   for (let i = 0; i < responses.length; i += 1) {
//     const response = responses[i];
//     if (response.request === message.replyTo) {
//       return response;
//     }
//   }
//   // no other way to finding out best response
//   return responses[0];
// };

const NotRegisteredError = createCustomError('NotRegisteredError');

export const MockMessenger = {
  msg: (message: Message|string|undefined, payload?: object, ctx?: object) => makeErrorMessage(new NotRegisteredError()),
  isError: (message: Message|string) => false,
  match: (message: Message|string, pattern: string|string[]) => false,
  error: makeErrorMessage,
  ask: async (message: Message|string|undefined, payload?: object, ctx?: object) => makeErrorMessage(new NotRegisteredError()),
  tell: (message: Message|string|undefined, payload?: object, ctx?: object) => makeErrorMessage(new NotRegisteredError()),
  throw: (error: Error|string, status?: number, ctx?: object) => makeErrorMessage(new NotRegisteredError()),
  listen: () => { return; }
}

export abstract class AbstractBarkeep implements Barkeep {
  protected messenger: Messenger;
  private builtApi: boolean = false;
  private listeners: { [pattern: string]: StrictHandler[] };
  private matchers: { [pattern: string]: string[] };

  protected api: MessengerApi;

  constructor() {
    this.messenger = {
      ask: this.ask.bind(this),
      tell: this.tell.bind(this),
      throw: this.throw.bind(this),
      listen: this.listen.bind(this),
      msg: this.msg,
      isError: this.isError,
      match: this.match,
      error: this.error
    }

    this.api = {
      ...this.messenger,
      barkeep: this.messenger
    }

    this.listeners = {};
    this.matchers = {};
  }

  /**
   * Make an error message
   * @param  error
   * @param  [status=400]
   * @param  [ctx={}]
   * @return Error message
   */
  error<T extends string>(
      error: Error | string | CustomError<T>, 
      status = 400, 
      ctx: object = {}
    ): Message {
    return makeErrorMessage(error, status, ctx);
  }

  /**
   * Makes a structured @code{Message} from give input. If @code{message} is a string,
   * the payload and context will added to make a message. If it is already a message, it's
   * context will be collected, and structured cleaned.
   * @param  message
   * @param  [payload]
   * @param  [ctx]
   * @return Message if one could could be created, else undefined
   */
   msg(
      message: Message|string|void, 
      payload : object = {}, 
      ctx: object = {}
    ): Message|undefined {
    if (message === undefined) {
      return undefined;
    } else if (typeof message === 'string') {
      return { type: message, payload, ctx };
    } else if (typeof message.type === 'string') {
      return {
        type: message.type,
        payload: Object.assign({}, payload, message.payload),
        ctx: Object.assign({}, ctx, message.ctx),
      };
    }
    return undefined;
  }

  isError(message: Message|string) {
    return this.match(message, '*ERROR'); 
  }

    /**
   * True, if value matches the given pattern(s), uses multimatch package
   * @param  message
   * @param  pattern
   * @return
   */
  match(message: Message|string, pattern: string|string[]): boolean {
    if (typeof message === 'string') {
      return multimatch(message, pattern).length > 0;
    } else if (message.type !== undefined) {
      return multimatch(message.type, pattern).length > 0;
    }
    return false;
  }

  /**
   * Add the given handler to the list of listeners corresponding to the given
   * pattern
   * @param   pattern
   * @param   handler
   * @param   [options={}]
   * @return this
   */
  use(pattern: string, handler: Handler, options: UseOptions = {}) : Registrar {
    const defaultOptions = {
      log: true, 
      setThisToBarkeep: true
    }

    const args: UseOptions = _.defaults(options, defaultOptions);

    if (!(typeof pattern === 'string')) {
      this.throw(new TavernError('Subscription pattern must be a string'));
      return this;
    }

    if (!(_.isFunction(handler))) {
      this.throw(new TavernError('Handler is not a function'));
      return this;
    }

    const wrappedHandler = AbstractBarkeep.wrapHandler(handler, this.api, args);
    const upperCasePattern = pattern.toUpperCase();

    if (!(pattern in this.listeners)) {
      this.listeners[upperCasePattern] = [];
      this.matchers[upperCasePattern] = upperCasePattern.split('|').map((part) => _.trim(part, ' '));
    }
    this.listeners[upperCasePattern].push(wrappedHandler);

    if (args.log) {
      this.tell('SUBSCRIBED', { patterns: [upperCasePattern] });
    }
    return this;
  }

  private registerService(service: ServiceInput) {
    if (this.isConstructor(service)) {
      const Service: ServiceConstructor = (service as ServiceConstructor);
      this.registerService(new Service());
    } else if (_.isFunction(service)) {
      this.registerService(service());
    } else if (_.isPlainObject(service)) {
      for (const pattern of Object.keys(service)) {
        this.use(pattern, (service as Subscriptions)[pattern], { log: false });
      }
      this.tell('SUBSCRIBED', { patterns: Object.keys(service) });
    } else {
      if (!('subscriptions' in service)) {
        this.throw(new TavernError('Invalid service'));
        return this;
      }

      mixin(service, this.api);
      for (const pattern of Object.keys(service.subscriptions)) {
        this.use(pattern, (service as Service).subscriptions[pattern].bind(service), { setThisToBarkeep: false, log: false });
      }

      const name = service.constructor ? service.constructor.name : null;
      this.tell('SUBSCRIBED', { patterns: Object.keys(service.subscriptions), name });
    }
  }

  /**
   * Register the service with the Barkeep. This involves adding listeners for
   * all the patterns that the service subscribes too. It can register a list of services too,
   * and when given functions or constructors, calls them before registering the service.
   *
   * @param  {Object} service
   * @return {Barkeep} this
   */
  register(...services: ServiceInput[]) {
    if (Array.isArray(services)) {
      for (let i = 0; i < services.length; i += 1) {
        this.registerService(services[i]);
      }
    } 
    return this;
  }

  protected matchHandlers(message: Message) : { [pattern: string]: StrictHandler[] } {
    const patterns = Object.keys(this.matchers)
      .filter((pattern) => this.match(message.type, this.matchers[pattern]));
    return _.pick(this.listeners, patterns);
  }

  private static wrapHandler(func: Handler, barkeep: MessengerApi, options: WrapHandlerOptions = {}) : StrictHandler {
    const defaultOptions = {
      setThisToBarkeep: false
    };

    const args: WrapHandlerOptions = _.defaults(options, defaultOptions);

    return async (payload: object, ctx: object, type: string) => {
      const that = args.setThisToBarkeep ? barkeep : undefined;
      const handled = func.call(that, payload, ctx, type, barkeep.barkeep);
      if (handled === undefined) {
        return undefined;
      } else {
        return (handled as StrictHandlerResponse);
      }
    }
  }

  private isConstructor(object: any): boolean {
    try {
      new object();
    } catch (err) {
      if (err.message.indexOf('is not a constructor') >= 0) {
        return false;
      }
    }
    return true;
  }

  abstract ask(this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object): Promise<Message>;
  abstract tell(this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object): Message;
  abstract throw(this: Messenger, error: Error|string, status?: number, ctx?: object): Message;
  abstract listen(this: Messenger): void;
};

interface WrapHandlerOptions {
  setThisToBarkeep?: boolean
}

interface UseOptions extends WrapHandlerOptions {
  log?: boolean
}