import multimatch from 'multimatch';
import _ from 'lodash';

import { checkArgType } from './utils';
import { Message } from './messenger';

export interface MatchFunction {
  (message: Message|string): boolean
}

export interface Matcher {
  match: MatchFunction
}

export class GlobPattern implements Matcher {
  readonly match: MatchFunction;

  private value: string;
  private sub_patterns: string[];

  private static splitIntoSubPatterns(pattern: string) : string[] {
    return pattern.split('|').map((part) => _.trim(part, ' '));
  }

  private static globMatch(message: Message|string, pattern: string|string[]): boolean {
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
    this.sub_patterns = GlobPattern.splitIntoSubPatterns(this.value);
    this.match = (message: Message|string) => GlobPattern.globMatch(message, this.sub_patterns);
  }
}

export function match(message: Message|string, pattern: string): boolean {
  return new GlobPattern(pattern).match(message);
}

export function createMatcher(pattern: string): MatchFunction {
  return new GlobPattern(pattern).match;
}
