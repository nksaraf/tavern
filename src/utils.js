/**
 * Create an Error class with the given name, can be used to
 * get better logging messages.
 * @param  {string} name Name of error
 * @return {CustomError}
 */
const createCustomError = (name) => {
  function CustomError(message, status = 400, ctx = {}) {
    const instance = new Error(message);
    instance.name = name;
    instance.status = status;
    instance.ctx = ctx;
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

export { createCustomError };
