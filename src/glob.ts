import multimatch from 'multimatch';
import _ from 'lodash';

import { validate, argError } from './utils';
import { Message } from './speaker';

export interface Matcher {
  (message: Message | string): boolean;
}

const parse = (pattern: string): string[] =>
  pattern
    .split('|')
    .map(part => _.trim(part, ' '))
    .filter(part => part.length > 0);

const matchGlob = (value: string, glob: string[]) =>
  multimatch(value.toUpperCase(), glob).length > 0;

export default function glob(pattern: string): Matcher {
  pattern = validate(pattern, 'string', 'pattern').toUpperCase();
  const globPattern = parse(pattern);
  return (message: Message | string) => {
    if (message == null) {
      return false;
    }

    if (_.isString(message)) {
      return matchGlob(message, globPattern);
    }

    if (
      validate(message, 'object', 'message') &&
      validate(message.type, 'string', 'message.type')
    ) {
      return matchGlob(message.type, globPattern);
    }

    throw argError('message', message, 'message|string');
    return false;
  };
}

export function match(message: Message | string, pattern: string) {
  return glob(pattern)(message);
}
