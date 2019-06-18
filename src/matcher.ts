import multimatch from 'multimatch';
import _ from 'lodash';

import { Message, checkArgType } from './utils';

export interface Matcher {
  (message: Message|string): boolean
}

export interface Pattern {
  // handlers: StrictHandler[];
  match: Matcher;
}

export class GlobPattern implements Pattern {
  match: Matcher;

  private value: string;
  private sub_patterns: string[];

  private splitIntoSubPatterns(pattern: string) : string[] {
    return pattern.split('|').map((part) => _.trim(part, ' '));
  }

  static match(message: Message|string, pattern: string|string[]): boolean {
    if (message === undefined) {
      return false;
    }

    if (_.isString(message)) {
      return multimatch(message.toUpperCase(), pattern).length > 0;
    } else if (checkArgType(message, 'object', 'message') && checkArgType(message.type, 'string', 'message.type')) {
      return multimatch(message.type.toUpperCase(), pattern).length > 0;
    }
    return false;
  }

  constructor(pattern: string) {
    this.value = pattern.toUpperCase();
    this.sub_patterns = this.splitIntoSubPatterns(this.value);
    this.match = (message: Message|string) => GlobPattern.match(message, this.sub_patterns);
  }
}

export function match(message: Message|string, pattern: string): boolean {
  return new GlobPattern(pattern).match(message);
}

export function createMatcher(pattern: string): Matcher {
  return new GlobPattern(pattern).match;
}
