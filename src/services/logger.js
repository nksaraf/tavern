import colors from 'colors';

/*  Function to test if an object is a plain object, i.e. is constructed
**  by the built-in Object constructor and inherits directly from Object.prototype
**  or null. Some built-in objects pass the test, e.g. Math which is a plain object
**  and some host or exotic objects may pass also.
**
**  @param {} obj - value to test
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

export default class Logger {
	getRepr = (value) => {
		if (value === undefined || value === null) return '?';
		if (Array.isArray(value)) return `[${'.'.repeat(value.length)}]`;
		if (isPlainObject(value)) return `{${'.'.repeat(Object.keys(value).length)}}`;
		else return value;
	}

	log = async (payload, ctx, type) => {
		if (type === 'ERROR') {
			console.log('🍷'.bold.red, 'ERROR'.underline.red, `[ ${payload.status}: ${payload.error} ]`.red)
		} else {
			const payloadRepr = Object.keys(payload).map((key) => `${key}:`.blue + ` ${this.getRepr(payload[key])}`.magenta).join(', ');
			console.log(
				'🍻'.bold.grey, 
				type.underline.green, 
				(Object.keys(payload).length > 0) ? payloadRepr : ''
			);
		}
	}

	subscriptions = {
		'*': this.log
	}
}