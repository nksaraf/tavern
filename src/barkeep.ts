// @ts-check

/**
 * @module tavern
 */

import mixin from 'merge-descriptors';
import multimatch from 'multimatch';
import _ from 'lodash';
import { createCustomError } from './utils';
import { 
  Message, 
  CustomError, 
  Matchers, 
  Registrar, 
  Messenger,
  Handler,
  MessengerHelpers,
  MessengerApi,
  Listeners,
  Service,
  ServiceConstructor,
  ServiceObject,
  ServiceGenerator,
  ServiceSubscriptions
} from './types';

const TavernError = createCustomError('TavernError');

/**
 * True, if value matches the given pattern(s), uses multimatch package
 * @param  message
 * @param  pattern
 * @return
 */
const match = (message: string | Message, pattern: string | string[]): boolean => {
  if (typeof message === 'string') {
    return multimatch(message, pattern).length > 0;
  } else if (message.type !== undefined) {
    return match(message.type, pattern);
  }
  return false;
};

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

/**
 * Makes a structured @code{Message} from give input. If @code{message} is a string,
 * the payload and context will added to make a message. If it is already a message, it's
 * context will be collected, and structured cleaned.
 * @param  message
 * @param  [payload={}]
 * @param  [ctx={}]
 * @return Message if one could could be created, else undefined
 */
const makeMessage = (
    message: Message | string | undefined, 
    payload: object = {}, 
    ctx: object = {}
  ): Message | undefined => {
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
};

/**
 * Make an error message
 * @param  error
 * @param  [status=400]
 * @param  [ctx={}]
 * @return Error message
 */
const makeError = <T extends string>(
    error: Error | string | CustomError<T>, 
    status = 400, 
    ctx = {}
  ): Message => {
  let errorName;
  let errorMessage;
  let errorStatus;
  let errorCtx;

  if (typeof error === 'string') {
    errorName = 'ERROR';
    errorMessage = error;
    errorStatus = status;
    errorCtx = ctx;
  } else {
    const { name, message } = error;
    errorName = name;
    errorMessage = message;
    errorStatus = (error as CustomError<T>).status || status;
    errorCtx = Object.assign({}, ctx, (error as CustomError<T>).ctx);
  }

  return {
    type: _.snakeCase(errorName).toUpperCase(),
    payload: { error: errorMessage, status: errorStatus },
    ctx: errorCtx,
  };
};


/**
 * List of patterns from @code{matchers} that match the given @code{value}
 *
 * @param  value
 * @param  matchers
 * @return matchedPatterns
 */
const matchPatterns = (value: string, matchers: Matchers): string[] => (
  Object.keys(matchers).filter((pattern) => match(value, matchers[pattern]))
);


const addApi = (func: Handler, barkeep: Messenger, options: any) => {
  const defaultOptions = {
    setThisToBarkeep: false
  };

  options = _.defaults(options || {}, defaultOptions);

  return async (payload: object, ctx: object, type: string) => {
    const that = options.setThisToBarkeep ? barkeep : undefined;
    return func.call(that, payload, ctx, type, barkeep);
  }
};

const isConstructor = (object: any): boolean => {
  try {
    new object();
  } catch (err) {
    if (err.message.indexOf('is not a constructor') >= 0) {
      return false;
    }
  }
  return true;
}

const nullApi = {
  ask: undefined,
  tell: undefined,
  throw: undefined,
  listen: undefined,
  msg: undefined,
  isError: undefined,
  match: undefined,
  error: undefined
}

abstract class ABarkeep implements Registrar, Messenger {
  error = makeError;
  msg = makeMessage;
  isError = (message: Message) => match(message, '*ERROR');
  match = match;

  private methods: MessengerHelpers & MessengerApi;
  private api: Messenger;

  private listeners: Listeners;
  private matchers: Matchers;

  constructor() {
    this.methods = Object.assign({}, nullApi);
    this.api = {
      ...this.methods,
      barkeep: this.methods
    }
    this.listeners = {};
    this.matchers = {};
  }

  /**
   * Add the given {@link handler} to the list of listeners corresponding to the given
   * pattern
   * @param   pattern
   * @param   handler
   * @param   [options={}]
   * @return this
   */
  use(pattern: string, handler: Handler, options: any) : Registrar {
    const defaultOptions = {
      log: true, 
      setThisToBarkeep: true
    }

    options = _.defaults(options || {}, defaultOptions);

    if (!(typeof pattern === 'string')) {
      this.throw(new TavernError('Subscription pattern must be a string'));
      return this;
    }

    if (!(_.isFunction(handler))) {
      this.throw(new TavernError('Handler is not a function'));
      return this;
    }

    const wrappedHandler = addApi(handler, this.api, options);
    const upperCasePattern = pattern.toUpperCase();

    if (!(pattern in this.listeners)) {
      this.listeners[upperCasePattern] = [];
      this.matchers[upperCasePattern] = upperCasePattern.split('|').map((part) => _.trim(part, ' '));
    }
    this.listeners[upperCasePattern].push(wrappedHandler);

    if (options.log) {
      this.tell('SUBSCRIBED', { patterns: [upperCasePattern] });
    }
    return this;
  }

  /**
   * Register the service with the Barkeep. This involves adding listeners for
   * all the patterns that the service subscribes too. It can register a list of services too,
   * and when given functions or constructors, calls them before registering the service.
   *
   * @param  {Object} service
   * @return {Barkeep} this
   */
  register(service: Service[] | Service) {
    if (Array.isArray(service)) {
      for (let i = 0; i < service.length; i += 1) {
        this.register(service[i]);
      }
    } else if (isConstructor(service)) {
      const Service: ServiceConstructor = (service as ServiceConstructor);
      this.register(new Service());
    } else if (_.isFunction(service)) {
      this.register(service());
    } else if (_.isPlainObject(service)) {
      for (const pattern of Object.keys(service)) {
        this.use(pattern, (service as ServiceObject)[pattern], { log: false });
      }
      this.tell('SUBSCRIBED', { patterns: Object.keys(service) });
    } else {
      if (!('subscriptions' in service)) {
        this.throw(new TavernError('Invalid service'));
        return this;
      }

      mixin(service, this.api, false);
      for (const pattern of Object.keys(service.subscriptions)) {
        this.use(pattern, (service as ServiceSubscriptions).subscriptions[pattern], { addApi: false, log: false });
      }

      const name = service.constructor ? service.constructor.name : null;
      this.tell('SUBSCRIBED', { patterns: Object.keys(service.subscriptions), name });
    }

    return this;
  }
}

/**
 * The Barkeep
 * @class
 * @property  {function(Service)}  register
 */
export default class Barkeep {
  constructor() {
    this.listeners = {};
    this.matchers = {};

    this.ask = this.ask.bind(this);
    this.tell = this.tell.bind(this);
    this.listen = this.listen.bind(this);
    this.throw = this.throw.bind(this);
    this.error = makeError;
    this.isError = (message) => match(message, '*ERROR');
    this.match = match;
    this.msg = makeMessage;

    this._api = {
      ask: this.ask,
      tell: this.tell,
      listen: this.listen,
      throw: this.throw,
      error: this.error,
      isError: this.isError,
      match: this.match,
      msg: this.msg,
    };

    this._extensions = {
      ...this._api,
      barkeep: this._api
    };
  }

  /**
   * Add the given {@link handler} to the list of listeners corresponding to the given
   * pattern
   * @param  {string}   pattern
   * @param  {Handler}  handler
   * @param  {Object}   [options={}]
   * @return {Barkeep} this
   */
  use(pattern, handler, options = { log: true, setThisToBarkeep: true }) {
    if (!(typeof pattern === 'string')) {
      this.throw(new TavernError('Subscription pattern must be a string'));
      return this;
    }

    if (!(_.isFunction(handler))) {
      this.throw(new TavernError('Handler is not a function'));
      return this;
    }

    const wrappedHandler = addApi(handler, this._extensions, options);
    const upperCasePattern = pattern.toUpperCase();

    if (!(pattern in this.listeners)) {
      this.listeners[upperCasePattern] = [];
      this.matchers[upperCasePattern] = upperCasePattern.split('|').map((part) => _.trim(part, ' '));
    }
    this.listeners[upperCasePattern].push(wrappedHandler);

    if (options.log) {
      this.tell('SUBSCRIBED', { patterns: [upperCasePattern] });
    }
    return this;
  }

  /**
   * Register the service with the Barkeep. This involves adding listeners for
   * all the patterns that the service subscribes too. It can register a list of services too,
   * and when given functions or constructors, calls them before registering the service.
   *
   * @param  {Object} service
   * @return {Barkeep} this
   */
  register(service) {
    if (Array.isArray(service)) {
      for (let i = 0; i < service.length; i += 1) {
        this.register(service[i]);
      }
    } else if (_.isFunction(service)) {
      const Service = service;
      this.register(new Service());
    } else if (_.isPlainObject(service)) {
      for (const pattern of Object.keys(service)) {
        this.use(pattern, service[pattern], { log: false });
      }
      this.tell('SUBSCRIBED', { patterns: Object.keys(service) });
    } else {
      if (!('subscriptions' in service)) {
        this.throw(new TavernError('Invalid service'));
        return this;
      }

      mixin(service, this._extensions, false);
      for (const pattern of Object.keys(service.subscriptions)) {
        this.use(pattern, service.subscriptions[pattern], { addApi: false, log: false });
      }

      const name = service.constructor ? service.constructor.name : null;
      this.tell('SUBSCRIBED', { patterns: Object.keys(service.subscriptions), name });
    }

    return this;
  }

  async _askRemainingHandlers(request, handlers, index) {
    for (let i = index; i < handlers.length; i += 1) {
      handlers[i](request.payload, request.ctx, request.type, this._extensions)
        .then((response) => this.tell(response, null, request.ctx));
    }
  }

  /**
   * Ask for a response to given message from available services
   * @param  {Message|string} message Type of the message or the whole {@link Message}
   * @param  {Object} [payload] Payload of the message
   * @param  {Object} [ctx]     Context associated with the message
   * @return {Message}  Response from services
   */
  async ask(message, payload, ctx) {
    const request = makeMessage(message, payload, ctx);
    if (request === undefined) {
      return this.throw(new TavernError('Invalid message to ask'));
    }

    const matchedPatterns = matchPatterns(request.type, this.matchers);
    let finalResponse;

    const handlers = _.flatMap(Object.values(_.pick(this.listeners, matchedPatterns)));
    let i;
    for (i = 0; i < handlers.length; i += 1) {
      const handler = handlers[i];
      let response;
      try {
        response = this.msg(await handler(
          request.payload, request.ctx, request.type, this._extensions,
        ), null, request.ctx);
      } catch (error) {
        response = this.error(error, null, request.ctx);
      }
      if (response !== null && response !== undefined) {
        // add way to identify proper response
        finalResponse = response;
        if (!finalResponse.ctx.private) {
          this.tell(finalResponse);
        }
        break;
      }
    }

    this._askRemainingHandlers(request, handlers, i + 1);

    if (finalResponse === undefined) {
      return this.throw(new TavernError('No reply'), 404, request.ctx);
    }

    finalResponse.ctx.request = request.type;
    return finalResponse;
  }


  async _asyncTell(message) {
    const matchedPatterns = matchPatterns(message.type, this.matchers);
    for (let i = 0; i < matchedPatterns.length; i += 1) {
      const pattern = matchedPatterns[i];
      for (let j = 0; j < this.listeners[pattern].length; j += 1) {
        const handler = this.listeners[pattern][j];
        const { type, payload, ctx } = message;
        handler(payload, ctx, type, this._extensions);
      }
    }
  }

  /**
   * Tells all the subscribed listeners about the given message asyncronously
   * and returns the same message to further be returned to answer requests.
   *
   * @param  {Message|string} message Type of the message or the whole {@link Message}
   * @param  {Object} [payload]  Payload of the message
   * @param  {Object} [ctx]      Context associated with the message
   * @returns {Message} same
   */
  tell(message, payload, ctx) {
    const event = this.msg(message, payload, ctx);
    if (event === undefined) {
      return this.error(new TavernError('Invalid message to tell'));
    } else {
      this._asyncTell(event);
      return event;
    }
  }

  throw<T extends string>(error: Error | string | CustomError<T>, status?: number, ctx?: object) {
    return this.tell(
      this.error(error, status, ctx)
    );
  }

  /**
   * Ask any available transportation services to start listening for
   * new messages (publishes LISTEN command)
   */
  listen() {
    this.tell('LISTEN');
  }
}
