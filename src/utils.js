/**
 * @typedef {Error} CustomError
 * @param {string} message
 * @param {number} status
 */

/**
 * Create an Error class with the given name, can be used to
 * get better logging messages.
 * @param  {string} name Name of error
 * @return {CustomError}
 */
const createCustomError = (name) => {
  function CustomError(message, status) {
    const instance = new Error(message);
    instance.name = name;
    instance.status = status;
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    if (Error.captureStackTrace) {
      Error.captureStackTrace(instance, CustomError);
    }
    return instance;
  }

  CustomError.prototype = Object.create(Error.prototype, {
    constructor: {
      value: Error,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  return CustomError;
};

export default createCustomError;
export { createCustomError };
