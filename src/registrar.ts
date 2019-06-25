import _ from 'lodash';
import mixin from 'merge-descriptors';

import { isConstructor, checkArgType } from './utils';
import { Matcher, GlobPattern } from './matcher';
import { Messenger, Message, Dict } from './messenger';
import { Subscriptions, Service, Handler, HandlerResponse } from './service';

interface ServiceGenerator {
  (): Service|Subscriptions
}

interface ServiceConstructor {
  new (): Service|Subscriptions
}

export type Subscriber = Service | Subscriptions | ServiceConstructor | ServiceGenerator;

export type AsyncHandler = (this: Messenger|any, payload: Dict, ctx: Dict, type: string, barkeep: Messenger) => Promise<HandlerResponse>;

interface AsyncSubscriptions extends Subscriptions {
  [pattern: string]: AsyncHandler | AsyncHandler[]
}

type MessagePattern = (AsyncHandler | AsyncHandler[]) & Matcher;

interface RegistrarSubscriptions extends AsyncSubscriptions {
  [pattern: string]: MessagePattern
}

interface WrapHandlerOptions {
  setThisToBarkeep?: boolean
}

interface UseOptions extends WrapHandlerOptions {
  logSubscription?: boolean
}

export default class Registrar extends Service {
  subscriptions: RegistrarSubscriptions = {};
  readonly messenger: Messenger;

  constructor() {
    super();
    this.messenger = {
      ask: this.ask.bind(this),
      tell: this.tell.bind(this),
      throw: this.throw.bind(this),
      msg: this.msg,
      match: this.match,
      error: this.error,
      isError: this.isError
    };
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
