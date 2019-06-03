/**
 * @module tavern
 */

import mixin from 'merge-descriptors';
import multimatch from 'multimatch';
import assert from 'assert';
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
  } else if (typeof message === 'object' && 'type' in message) {
    return match(message.type, pattern);
  } else {
    return false;
  }
}

/** @interface */
export class Service {
  /**
   * Message patterns that the service 
   * wants to listen to and the corresponding list of handlers
   * @type {Object.<string,Handler>}
   */
  subscriptions
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

/*  Function to test if an object is a plain object, i.e. is constructed
**  by the built-in Object constructor and inherits directly from Object.prototype
**  or null. Some built-in objects pass the test, e.g. Math which is a plain object
**  and some host or exotic objects may pass also.
**
**  @param {any} obj - value to test
**  @returns {Boolean} true if passes tests, false otherwise
*/
const isPlainObject = (obj) => {
  // Basic check for Type object that's not null
  if (typeof obj == 'object' && obj !== null) {

    // If Object.getPrototypeOf supported, use it
    if (typeof Object.getPrototypeOf == 'function') {
      var proto = Object.getPrototypeOf(obj);
      return proto === Object.prototype || proto === null;
    }
    
    // Otherwise, use internal class
    // This should be reliable as if getPrototypeOf not supported, is pre-ES5
    return Object.prototype.toString.call(obj) == '[object Object]';
  }
  
  // Not an object
  return false;
}

/**
 * Checks if the @code{message} is an error message
 * @param  {Message}    message 
 * @return {boolean}
 */
const isError = (message) => {
  return match(message, '*ERROR');
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
const makeMessage = (message, payload={}, ctx={}) => {
  if (message === null) {
    return undefined;
  } 

  else if (
    typeof message === 'object' 
    && message.type !== undefined 
    && typeof message.type === 'string'
  ) {
    return { 
      type: message.type, 
      payload: message.payload || payload, 
      ctx: (message.ctx || ctx) 
    };
  } 

  else if (typeof message === 'string') {
    return { 
      type: message, 
      payload, 
      ctx 
    }
  }

  return undefined;
}

/**
 * Make an error message
 * @param  {string|Error} error 
 * @param  {Number} [status=400]
 * @param  {Object} [ctx={}]    
 * @return {Message}        
 */
const makeError = (error, status=400, ctx={}) => {
  let name, message, _status;
  if (typeof error === 'string') {
    name = 'ERROR';
    message = error;
    _status = status;
  } else {
    name = error.name;
    message = error.message;
    _status = error.status || status;
  }

  return {
    type: _.snakeCase(name).toUpperCase(),
    payload: { error: message, status: _status },
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
  return Object.keys(matchers)
    .filter(pattern => match(value, matchers[pattern]));
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

const addApi = (func, barkeep, options={ setThisToBarkeep: false }) => async () => {
  [].push.call(arguments, barkeep);
  const that = options.setThisToBarkeep ? barkeep : null;
  return await func.apply(that, arguments);
}

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
    this.register = this.register.bind(this);
    this.use = this.use.bind(this);
    this.listen = this.listen.bind(this);

    this._api = {
      ask: this.ask,
      tell: this.tell,
      register: this.register,
      use: this.use,
      listen: this.listen
    }

    this._extensions = {
      ...this.api,
      barkeep: this._api,
      error: makeError,
      isError: isError,
      isType: match,
      msg: makeMessage
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
  use(pattern, handler, options={ log: true, setThisToBarkeep: true }) {
    if (!(typeof pattern === 'string')) { 
      this.tell(makeError(new TavernError('Subscription pattern must be a string')));
      return this;
    }

    if (!isFunction(handler)) {
      this.tell(makeError(new TavernError('Handler is not a function')));
      return this;
    }

    if (options.setThisToBarkeep) {
      handler = addApi(handler, this._extensions, options);
    }

    pattern = pattern.toUpperCase();
    if (!(pattern in this._listeners)) {
      this._listeners[pattern] = [];
      this._matchers[pattern] = pattern.split('|').map((part) => _.trim(part, ' '));
    }
    this._listeners[pattern].push(handler);

    if (options.log) {
      this.tell(makeMessage('SUBSCRIBED', { patterns: [pattern]}));
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
      for (let i = 0; i < service.length; i++) {
        this.register(service[i]);
      }
    } 

    else if (isFunction(service)) {
      this.register(new service());
    } 

    else if (isPlainObject(service)) {
      for (const pattern of Object.keys(service)) {
        this.use(pattern, service[pattern], { log: false });
      }
      this.tell(makeMessage('SUBSCRIBED', { patterns: Object.keys(service) }));
    } 

    else {
      if (!('subscriptions' in service)) {
        this.tell(makeError(new TavernError('Invalid service')));
        return this;
      }

      mixin(service, this._extensions, false);
      for (const pattern of Object.keys(service.subscriptions)) {
        this.use(pattern, service.subscriptions[pattern], { addApi: false, log: false });
      }

      let name = service.constructor ? service.constructor.name : null;
      this.tell(makeMessage('SUBSCRIBED', { patterns: Object.keys(service.subscriptions), name }));
    }

    return this;
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
      return this.tell(makeError(new TavernError('Invalid message to ask')));
    }

    const matchedPatterns = matchPatterns(request.type, this._matchers);
    const responses = [];
    for (let i = 0; i < matchedPatterns.length; i++) {
      const pattern = matchedPatterns[i];
      // looping through services that subscribe
      for (let j = 0; j < this._listeners[pattern].length; j++) {
        const handler = this._listeners[pattern][j];
        let response;
        try {
          const { type, payload, ctx } = request;
          response = makeMessage(await handler(payload, ctx, type));
        } catch (error) {
          response = makeError(error);
        }
        if (response !== null && response !== undefined) {
          if (!request.ctx.private && !response.ctx.private) {
            this.tell(response);
          }
          response.ctx.request = request.type;
          responses.push(response);
        }
      }
    }

    if (responses.length === 0) {
      const errorMsg = makeError(new TavernError('No reply', 404), ctx={ message: request.type });
      return this.tell(errorMsg);
    }

    return findResponseToMessage(responses, request);
  }


  async _asyncTell(message) {
    const matchedPatterns = matchPatterns(message.type, this._matchers);
    for (let i = 0; i < matchedPatterns.length; i++) {
      const pattern = matchedPatterns[i];
      for (let j = 0; j < this._listeners[pattern].length; j++) {
        const handler = this._listeners[pattern][j];
        const { type, payload, ctx } = message;
        handler(payload, ctx, type)
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
    const event = makeMessage(message, payload, ctx);
    if (event === undefined) {
      return makeError(new TavernError('Invalid message to tell'));
    } else {
      this._asyncTell(event);
      return event;
    }
  }

  /**
   * Ask any available transportation services to start listening for
   * new messages (publishes LISTEN command)
   */
  listen() {
    this.tell('LISTEN');
  }
}