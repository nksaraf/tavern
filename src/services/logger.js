import colors from 'colors';
import _ from 'lodash';

export default class Logger {
  constructor(log = console.log) {
    this.log = log;
  }

  getRepr = (value) => {
    if (value === undefined || value === null) return '?';
    if (Array.isArray(value)) return `[${'.'.repeat(value.length)}]`;
    if (_.isPlainObject(value)) return `{ ${Object.keys(value).join(' ')} }`;
    else return value;
  }

  logError = ({ status, error }, ctx, type) => {
    const message = (type === 'ERROR') ? `${status}: ${error}` : `${error}`;
    this.log('🍷', type.underline.red, message.red);
  }

  logSubscription = ({ patterns, name }, ctx, type) => {
    const formattedName = name ? `<${name}>`.magenta : '';
    this.log(
      '🍾',
      type.underline.blue,
      formattedName,
      patterns.map((pattern) => pattern.toUpperCase()).join(', ').green
    );
  }

  logMessage = (payload, ctx, type) => {
    const payloadRepr = Object.keys(payload)
      .map((key) => `${key}:`.blue + ` ${this.getRepr(payload[key])}`.magenta)
      .join(', ');

    this.log('🍻', type.underline.green, (Object.keys(payload).length > 0) ? payloadRepr : '');
  }

  logResponse = (payload, ctx, type) => {
    if (this.isError(payload.type)) {
      this.log('🍷', type.underline.red, payload.type.red);
    } else {
      this.log('🍸', type.underline.green, payload.type.blue);
    }
  }

  logLog = ({ message }) => {
    this.log('🍻', message.blue);
  }

  subscriptions = {
    SUBSCRIBED: this.logSubscription,
    RESPONSE: this.logResponse,
    LOG: this.logLog,
    '*ERROR': this.logError,
    '*|!*ERROR|!SUBSCRIBED|!RESPONSE|!LOG': this.logMessage,
  }
}
