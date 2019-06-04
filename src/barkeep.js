/**
 * @module tavern
 */

import mixin from 'merge-descriptors';
import multimatch from 'multimatch';
import _ from 'lodash';
import { createCustomError } from './utils';

const TavernError = createCustomError('TavernError');

/**
 * @typedef   {Object} Message
 *
 * @property  {string} type - Description of message, matched against listener patterns
 * @property  {Object} payload - Additional information important to the message
 * @property  {Object} context - Metadata related to the message and its passage
 */

/**
 * @typedef {function} Handler
 *
 * @param   {Object}  [payload]
 * @param   {Object}  [context]
 * @param   {string}  [type]
 * @return  {Message|string|undefined} response
 */

/**
 * True, if value matches the given pattern(s), uses multimatch package
 * @param  {string} value
 * @param  {string|string[]} pattern
 * @return {boolean}
 */
const match = (message, pattern) => {
  if (typeof message === 'string') {
    return multimatch(message, pattern).length > 0;
  } else if (message.type !== undefined) {
    return match(message.type, pattern);
  }
  return false;
};

/**
 * @typedef {interface} Service
 * @property {Object.<string,Handler>} subscriptions
 */

/**
 * Resolve which of the @code{response} to reply to the service which
 * sent this @code{message}
 * @private
 * @param  {Message[]}  responses
 * @param  {Message}    message
 * @return {Message}
 */
const findResponseToMessage = (responses, message) => {
  if (responses.length === 1) {
    return responses[0];
  }
  for (let i = 0; i < responses.length; i += 1) {
    const response = responses[i];
    if (response.request === message.replyTo) {
      return response;
    }
  }
  // no other way to finding out best response
  return responses[0];
};

/**
 * Checks if the @code{message} is an error message
 * @param  {Message}    message
 * @return {boolean}
 */
const isError = (message) => match(message, '*ERROR');

/**
 * Makes a structured @code{Message} from give input. If @code{message} is a string,
 * the payload and context will added to make a message. If it is already a message, it's
 * context will be collected, and structured cleaned.
 * @param  {Message|string} message
 * @param  {Object}     [payload={}]
 * @param  {Object}     [ctx={}]
 * @return {Message}
 */
const makeMessage = (message, payload = {}, ctx = {}) => {
  if (message === null || message === undefined) {
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
 * @param  {string|Error} error
 * @param  {Number} [status=400]
 * @param  {Object} [ctx={}]
 * @return {Message}
 */
const makeError = (error, status = 400, ctx = {}) => {
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
    errorStatus = error.status || status;
    errorCtx = Object.assign({}, ctx, error.ctx);
  }

  return {
    type: _.snakeCase(errorName).toUpperCase(),
    payload: { error: errorMessage, status: errorStatus },
    ctx: errorCtx,
  };
};

/**
 * List of patterns from @code{matchers} that match the given @code{value}
 * @private
 * @param  {string} value
 * @param  {Object.<string, Gex>} matchers
 * @return {string[]} matchedPatterns
 */
const matchPatterns = (value, matchers) => (
  Object.keys(matchers).filter((pattern) => match(value, matchers[pattern]))
);

const addApi = (func, barkeep, options = { setThisToBarkeep: false }) => (
  async (payload, ctx, type) => {
    const that = options.setThisToBarkeep ? barkeep : null;
    return func.call(that, payload, ctx, type, barkeep);
  }
);

/**
 * The Barkeep
 * @class
 * @property  {function(Service)}  register
 */
export default class Barkeep {
  constructor() {
    this._listeners = {};
    this._matchers = {};

    this.ask = this.ask.bind(this);
    this.tell = this.tell.bind(this);
    this.listen = this.listen.bind(this);
    this.throw = this.throw.bind(this);
    this.error = makeError;
    this.isError = isError;
    this.match = match;
    this.msg = makeMessage;

    this._api = {
      ask: this.ask,
      tell: this.tell,
      listen: this.listen,
      throw: this.throw,
    };

    this._extensions = {
      ...this._api,
      barkeep: this._api,
      error: this.error,
      isError: this.isError,
      match: this.match,
      msg: this.msg,
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

    if (!(pattern in this._listeners)) {
      this._listeners[upperCasePattern] = [];
      this._matchers[upperCasePattern] = upperCasePattern.split('|').map((part) => _.trim(part, ' '));
    }
    this._listeners[upperCasePattern].push(wrappedHandler);

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
      this.register(new service());
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

    const matchedPatterns = matchPatterns(request.type, this._matchers);
    let finalResponse;

    const handlers = _.flatMap(Object.values(_.pick(this._listeners, matchedPatterns)));
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
    const matchedPatterns = matchPatterns(message.type, this._matchers);
    for (let i = 0; i < matchedPatterns.length; i += 1) {
      const pattern = matchedPatterns[i];
      for (let j = 0; j < this._listeners[pattern].length; j += 1) {
        const handler = this._listeners[pattern][j];
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

  throw(...args) {
    return this.tell(this.error(...args));
  }

  /**
   * Ask any available transportation services to start listening for
   * new messages (publishes LISTEN command)
   */
  listen() {
    this.tell('LISTEN');
  }
}
