import chalk from 'chalk';
import _ from 'lodash';

import { BaseService } from '../tavern';

export default class Logger extends BaseService {
  log: typeof console.log
  
  constructor(log = console.log) {
    super();
    this.log = log;
  }

  getRepr(value: any) : string {
    if (value === undefined || value === null) return '?';
    if (Array.isArray(value)) return `[${'.'.repeat(value.length)}]`;
    if (_.isPlainObject(value)) return `{ ${Object.keys(value).join(' ')} }`;
    else return value.toString();
  }

  logError({ status, error }: LogErrorPayload, ctx: object, type: string) {
    const message = (type === 'ERROR') ? `${status}: ${error}` : `${error}`;
    this.log('🍷', chalk.underline.red(type), chalk.red(message));
  }

  logSubscription({ patterns, name }: LogSubscriptionPayload, ctx: object, type: string) {
    const formattedName = name ? chalk.magenta(`<${name}>`) : '';
    this.log(
      '🍾',
      chalk.underline.blue(type),
      formattedName,
      patterns.map((pattern: string) => chalk.green(pattern.toUpperCase())).join(', ')
    );
  }

  logMessage(payload: LogMessagePayload, ctx: object, type: string) {
    const payloadRepr = Object.keys(payload)
      .map((key) => chalk.blue(`${key}:`) + chalk.magenta(` ${this.getRepr(payload[key])}`))
      .join(', ');

    this.log('🍻', chalk.underline.green(type), (Object.keys(payload).length > 0) ? payloadRepr : '');
  }

  logResponse({ type }: LogResponsePayload, ctx, msgType) {
    if (this.isError(type)) {
      this.log('🍷', chalk.underline.red(msgType), chalk.red(type));
    } else {
      this.log('🍸', chalk.underline.green(msgType), chalk.blue(type));
    }
  }

  logLog({ message }: LogLogPayload) {
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

interface LogLogPayload {
  message: string
}

interface LogResponsePayload {
  type: string
}

interface LogMessagePayload {
  [key: string]: any
}

interface LogSubscriptionPayload {
  patterns: string[]
  name?: string
}

interface LogErrorPayload {
  error: string
  status: number
}
