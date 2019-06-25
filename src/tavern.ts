import { makeErrorMessage, isErrorMessage } from './error';
import { makeMessage } from './messenger';
import { match } from './matcher';

import Barkeep from './barkeep';

import _ from 'lodash';

export const tavern = new Barkeep();

export const utils = {
  msg: makeMessage,
  error: makeErrorMessage,
  isError: isErrorMessage,
  match: match
}

export { createCustomError } from './error';
export { Service } from './service';

export default tavern;
