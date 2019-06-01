/**
 * @module tavern
 */

import mixin from 'merge-descriptors';
import gex from 'gex';
import assert from 'assert';

/**
 * @typedef   {Object} Message
 * @property  {string} type - Description of message, matched against listener patterns
 * @property  {Object} payload - Additional information important to the message
 * @property  {Object} context - Metadata related to the message and its passage
 */

/**
 * @typedef {function} Handler
 * @param   {Object}  [payload]
 * @param   {Object}  [context]
 * @param   {string}  [type]
 * @return  {Message|string|undefined} response
 */

/**
 * @interface
 */
export class Service {
  /**
   * Message patterns that the service 
   * wants to listen to and the corresponding list of handlers
   * @type {Object.<string,Handler>}
   */
  subscriptions
}

/**
 * @typedef {Object} Gex
 */

/**
 * Checks if the @code{message} matches with the @code{pattern} using
 * glob-matching rules
 * @param  {Message}    message
 * @param  {string}     pattern
 * @return {boolean}
 */
export const isType = (message, pattern) => {
  return gex(pattern).on(message.type) !== null;
}

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
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (response.request === message.replyTo) {
      return response;
    }
  }
  // no other way to finding out best response
  return responses[0];
}

/**
 * Checks if the @code{message} is an error message
 * @param  {Message}    message 
 * @return {boolean}
 */
const isError = (message) => {
  return isType(message, '*ERROR');
}

/**
 * Makes a structured @code{Message} from give input. If @code{message} is a string, 
 * the payload and context will added to make a message. If it is already a message, it's
 * context will be collected, and structured cleaned.
 * @param  {Message|string} message
 * @param  {Object}     [payload={}] 
 * @param  {Object}     [ctx={}]     
 * @return {Message}         
 */
const makeMessage = (message, _payload={}, _ctx={}) => {
  if (typeof message === 'object' && message.type !== undefined) {
    const { type, payload=_payload, ctx=_ctx, ...rest } = message;
    if (type === undefined) {
      return makeError('No type for message provided');
    }
    return { type, payload, ctx: { ...ctx, ...rest }};
  } else if (typeof message === 'string') {
    return { type: message, payload: _payload, ctx: _ctx }
  }
  return undefined;
}

/**
 * Make an error message
 * @param  {string} message 
 * @param  {Number} [status=400]
 * @param  {Object} [ctx={}]    
 * @return {Message}        
 */
const makeError = (message, status=400, ctx={}) => {
  return {
    type: 'ERROR',
    payload: { error: message, status },
    ctx: ctx
  };
}

/**
 * List of patterns from @code{matchers} that match the given @code{value}
 * @private
 * @param  {string} value    
 * @param  {Object.<string, Gex>} matchers
 * @return {string[]} matchedPatterns
 */
const matchPatterns = (value, matchers) => {
  value = value.toUpperCase();
  const matchedPatterns = [];
  for (const pattern in matchers) {
    if (matchers[pattern].on(value) !== null) {
      matchedPatterns.push(pattern);
    }
  }
  return matchedPatterns;
}

/**
 * True if @code{object} is a function or a constructor
 * @private
 * @param  {any} object 
 * @return {boolean}
 */
const isFunction = (object) => {
  return !!(object && object.constructor && object.call && object.apply);
}

/**
 * The Barkeep
 * @class
 * @property  {function(Service)}  register
 */
export default class Barkeep {

  /** @type {Service[]} List of services registered */
  _services = []
  /**
   * List of handlers for each pattern being listened to
   * @type {Object.<string, Handler[]>}
   */
  _listeners = {}
  /**
   * Glob-matching objects corresponding to message patterns
   * @type {Object.<string, Gex>}
   */
  _matchers = {}

  /**
   * [description]
   * @param  {Message|string} message [description]
   * @param  {Object} [payload] [description]
   * @param  {Object} [ctx]     [description]
   * @return {Message}         [description]
   */
  async ask(message, payload, ctx) {
    message = makeMessage(message, payload, ctx);
    if (message === undefined || message === null || message.type === undefined) {
      return;
    }
    const matchedPatterns = matchPatterns(message.type, this._matchers);
    const responses = [];
    for (let i = 0; i < matchedPatterns.length; i++) {
      const pattern = matchedPatterns[i];
      // looping through services that subscribe
      for (let j = 0; j < this._listeners[pattern].length; j++) {
        const handler = this._listeners[pattern][j];
        let response;
        try {
          const { type, payload, ctx } = message;
          response = makeMessage(await handler(payload, ctx, type));
        } catch (error) {
          response = makeError(error.message, 400);
        }
        if (response !== null && response !== undefined) {
          if (!message.ctx.private && !response.ctx.private) {
            this.tell(response);
          }
          response.ctx.request = message.type;
          responses.push(response);
        }
      }
    }

    if (responses.length === 0) {
      const errorMsg = makeMessage({
        type: 'ERROR',
        payload: { error: 'Reply not found', status: 404 },
        ctx: { message: message.type }
      });
      this.tell(errorMsg);
      return errorMsg;
    }

    return findResponseToMessage(responses, message);
  }

  /**
   * [description]
   * @param  {Message|string} message [description]
   * @param  {Object} [payload] [description]
   * @param  {Object} [ctx]     [description]
   */
  async tell(message, payload, ctx) {
    message = makeMessage(message, payload, ctx);
    if (message === undefined || message === null || message.type === undefined) {
      return;
    }
    const matchedPatterns = matchPatterns(message.type, this._matchers);
    for (let i = 0; i < matchedPatterns.length; i++) {
      const pattern = matchedPatterns[i];
      // looping through services that subscribe
      for (let j = 0; j < this._listeners[pattern].length; j++) {
        const handler = this._listeners[pattern][j];
        const { type, payload, ctx } = message;
        // try {
          handler(payload, ctx, type)
        // } catch (error) {
        //   this.tell({
        //     type: 'ERROR',
        //     payload: { error: error.message, status: 999 },
        //     context: { message: message.type }
        //   });
        // }
      }
    }
  }

  /**
   * Add the given {@link handler} to the list of listeners corresponding to the given
   * pattern
   * @param  {string}   pattern 
   * @param  {Handler}  handler 
   * @return {Barkeep} this
   */
  use(pattern, handler) {
    assert(typeof pattern === 'string');
    assert(isFunction(handler));
    pattern = pattern.toUpperCase();
    if (!(pattern in this._listeners)) {
      this._listeners[pattern] = [];
      this._matchers[pattern] = gex(pattern);
    }
    this._listeners[pattern].push(handler);
    return this;
  }

  /**
   * [extensions description]
   * @type {Object}
   */
  extensions = {
    barkeep: {
      ask: this.ask,
      tell: this.tell
    },
    error: makeError,
    isError: isError,
    isType: isType,
    msg: makeMessage
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
      for (let i = 0; i < service.length; i++) {
        this.register(service[i]);
      }
    }
    else if (isFunction(service)) {
      this.register(new service());
    }
    else {
      assert('subscriptions' in service, 'No subscriptions found in service');
      console.log('Subscribing', Object.keys(service.subscriptions));
      mixin(service, this.extensions, false);
      this._services.push(service);
      for (const pattern of Object.keys(service.subscriptions)) {
        this.use(pattern, service.subscriptions[pattern]);
      }
    }
    return this;
  }

  /**
   * Listen to incoming messages
   */
  async listen() {
    await this.tell('LISTEN');
  }
}