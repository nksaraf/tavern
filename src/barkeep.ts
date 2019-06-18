import mixin from 'merge-descriptors';
import _ from 'lodash';

import {
  Handler, StrictHandler, StrictHandlerResponse, Service, Subscriber,
  ServiceGenerator, ServiceConstructor, Subscriptions
} from './service';
import { CustomError, makeErrorMessage, isErrorMessage } from './error';
import { Message, makeMessage, checkArgType, isConstructor } from './utils';
import { match, Pattern, GlobPattern } from './matcher';

export interface Messenger {
  ask: (this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object) => Promise<Message>
  tell: (this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object) => Message
  throw: (this: Messenger, error: Error|string, status?: number, ctx?: object) => Message
  error: typeof makeErrorMessage
  msg: typeof makeMessage
  match: typeof match
  isError: typeof isErrorMessage
}

interface Listener {
  /**
   * Ask any available transportation services to start listening for
   * new messages (publishes LISTEN command)
   */
  listen: (this: Messenger) => void
}

interface MessagePattern extends Pattern {
  handlers: StrictHandler[];
}

class GlobMessagePattern extends GlobPattern implements MessagePattern {
  handlers: StrictHandler[]

  constructor(pattern: string) {
    super(pattern);
    this.handlers = [];
  }
}

interface Registrar {
  patterns: { [pattern: string]: MessagePattern }

  /**
   * Register the service with the Barkeep. This involves adding listeners for
   * all the patterns that the service subscribes too. It can register a list of services too,
   * and when given functions or constructors, calls them before registering the service.
   *
   * @param  {Object} service
   * @return {Barkeep} this
   */
  register: (this: Registrar, ...services: Service[]) => Registrar

  /**
  * Add the given handler to the list of listeners corresponding to the given
  * pattern
  * @param   pattern
  * @param   handler
  * @param   [options={}]
  * @return this
  */
  use: (this: Registrar, pattern: string, handler: Handler, options?: UseOptions) => Registrar

  getHandlers: (this: Registrar, message: Message|string) => StrictHandler[]
}

export type Barkeep = Registrar & Messenger & Listener;

export abstract class AbstractBarkeep implements Barkeep {
  error = makeErrorMessage;
  msg = makeMessage;
  match = match;
  isError = isErrorMessage;

  patterns: { [pattern: string]: MessagePattern };
  protected api : Messenger;

  constructor() {
    this.patterns = {};
    this.api = {
      ask: this.ask.bind(this),
      tell: this.tell.bind(this),
      throw: this.throw.bind(this),
      error: makeErrorMessage,
      msg: makeMessage,
      match: match,
      isError: isErrorMessage,
    }
  }

  use(pattern: string, handler: Handler, options: UseOptions = {}) : Registrar {
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
    const wrappedHandler = AbstractBarkeep.wrapHandler(handler, this.api, args);

    pattern = pattern.toUpperCase();
    if (!(pattern in this.patterns)) {
      this.patterns[pattern] = new GlobMessagePattern(pattern);
    }
    this.patterns[pattern].handlers.push(wrappedHandler);

    if (args.logSubscription) {
      this.tell('SUBSCRIBED', { patterns: [pattern] });
    }
    return this;
  }

  register(...services: Service[]) {
    for (let i = 0; i < services.length; i += 1) {
      this.registerService(services[i]);
    }
    return this;
  }

  getHandlers(message: string|Message): StrictHandler[] {
    checkArgType(message, 'message', 'message');
    return _.flatMap(this.patterns, (value) => {
      if(value.match(message)) {
        return value.handlers;
      } else {
        return [];
      }
    });
  }

  abstract ask(this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object): Promise<Message>;
  abstract tell(this: Messenger, message: Message|string|undefined, payload?: object, ctx?: object): Message;

  throw<T extends string>(error: Error|CustomError<T>|string , status: number = 400, ctx: object = {}) : Message {
    return this.tell(
      this.error(error, status, ctx)
    );
  }

  listen() {
    this.tell('LISTEN');
  }

  private registerService(serviceInput: Service) {
    if (isConstructor(serviceInput)) {
      const ServiceClass = (serviceInput as ServiceConstructor);
      this.registerService(new ServiceClass());

    } else if (_.isFunction(serviceInput)) {
      this.registerService((serviceInput as ServiceGenerator)());

    } else if (_.isPlainObject(serviceInput)) {
      const subscriptions = (serviceInput as Subscriptions);
      for (const pattern of Object.keys(subscriptions)) {
        this.use(
          pattern,
          subscriptions[pattern].bind(serviceInput),
          { setThisToBarkeep: false, logSubscription: false }
        );
      }
      this.tell('SUBSCRIBED', { patterns: Object.keys(serviceInput) });
      mixin(serviceInput, this.api);
    } else {
      const subscriber = serviceInput as Subscriber;
      checkArgType(subscriber.subscriptions, 'object', 'service.subscriptions');
      mixin(subscriber, this.api);
      for (const pattern of Object.keys(subscriber.subscriptions)) {
        this.use(
          pattern,
          subscriber.subscriptions[pattern].bind(subscriber),
          { setThisToBarkeep: false, logSubscription: false }
        );
      }
      const name = subscriber.constructor ? subscriber.constructor.name : null;
      this.tell('SUBSCRIBED', { patterns: Object.keys(subscriber.subscriptions), name });
    }
  }

  private static wrapHandler(func: Handler, barkeep: Messenger, options: WrapHandlerOptions = {}) : StrictHandler {
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
        return (handled as StrictHandlerResponse);
      }
    }
  }

}

interface WrapHandlerOptions {
  setThisToBarkeep?: boolean
}

interface UseOptions extends WrapHandlerOptions {
  logSubscription?: boolean
}
