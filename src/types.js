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
 * @typedef {interface} Service
 * @property {Object.<string,Handler>} subscriptions
 */

/**
 * @typedef {Error} CustomError
 * @param {string} message
 * @param {number} status
 */
