import chalk from 'chalk';
import _ from 'lodash';

import tavern from '../tavern';
import { Dict } from '../types';

// const LoggerError = tavern.createCustomError('LoggerError');

export default class Logger extends tavern.Service {
  private log: (message?: any, ...optionalParams: any[]) => void

  constructor(log: ((message?: any, ...optionalParams: any[]) => void) = console.log) {
    super();
    this.log = log;
  }

  private getRepr(value: any) : string {
    if (value === undefined || value === null) return '?';
    if (Array.isArray(value)) return `[${'.'.repeat(value.length)}]`;
    if (_.isPlainObject(value)) return `{ ${Object.keys(value).join(' ')} }`;
    else return value.toString();
  }

  private logError({ status, error }: LogErrorPayload, ctx: Dict, type: string) {
    if (status === undefined || error === undefined) {
      this.logError({ status: 400, error: 'Invalid params to logger'}, {}, 'Logger Error');
    }
    const message = (type === 'ERROR') ? `${status}: ${error}` : `${error}`;
    this.log('🍷', chalk.underline.red(type), chalk.red(message));
  }

  private logSubscription({ patterns, name }: LogSubscriptionPayload, ctx: Dict, type: string) {
    if (patterns === undefined) {
      this.logError({ status: 400, error: 'Invalid params to logger'}, {}, 'Logger Error');
    } else if (name !== undefined) {
      this.log(
        '🍾',
        chalk.underline.blue(type),
        chalk.magenta(`<${name}>`),
        patterns.map((pattern: string) => chalk.green(pattern.toUpperCase())).join(', ')
      );
    } else {
      this.log(
        '🍾',
        chalk.underline.blue(type),
        patterns.map((pattern: string) => chalk.green(pattern.toUpperCase())).join(', ')
      );
    }
  }

  private logMessage(payload: Dict, ctx: Dict, type: string) {
    const payloadRepr = Object.keys(payload)
      .map((key) => chalk.blue(`${key}:`) + chalk.magenta(` ${this.getRepr(payload[key])}`))
      .join(', ');

    this.log('🍻', chalk.underline.green(type), (Object.keys(payload).length > 0) ? payloadRepr : '');
  }

  private logResponse({ type }: LogResponsePayload, ctx: Dict, msgType: string) {
    if (type === undefined) {
      this.logError({ status: 400, error: 'Invalid params to logger'}, {}, 'Logger Error');
    }
    else if (this.isError(type)) {
      this.log('🍷', chalk.underline.red(msgType), chalk.red(type));
    } else {
      this.log('🍸', chalk.underline.green(msgType), chalk.blue(type));
    }
  }

  private logLog({ message }: LogLogPayload) {
    if (message === undefined) {
      this.logError({ status: 400, error: 'Invalid params to logger'}, {}, 'Logger Error');
    }
    else {
      this.log('🍻', chalk.blue(message));
    }
  }

  subscriptions = {
    SUBSCRIBED: this.logSubscription,
    RESPONSE: this.logResponse,
    LOG: this.logLog,
    '*ERROR': this.logError,
    '*|!*ERROR|!SUBSCRIBED|!RESPONSE|!LOG': this.logMessage,
  }
}

interface LogLogPayload extends Dict {
  message?: string
}

interface LogResponsePayload extends Dict {
  type?: string
}

interface LogSubscriptionPayload extends Dict {
  patterns?: string[]
  name?: string
}

interface LogErrorPayload extends Dict {
  error?: string
  status?: number
}
