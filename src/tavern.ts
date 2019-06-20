import { makeErrorMessage, isErrorMessage } from './error';
import { makeMessage } from './messenger';
import { match } from './matcher';

import Barkeep from './barkeep';

import _ from 'lodash';

// interface TavernOptions {
//   mode?: string;
//   logger?: boolean;
// }

// const defaultOptions = {
//   mode: 'local',
//   logger: true
// }

/**
 * Factory function to create an instance of {@link Barkeep}
 * @return barkeep
 */
// function tavern(options: TavernOptions = {}) : Barkeep {
//   const args = _.defaults(options, defaultOptions);
//   if (args.mode === 'local') {
//     const barkeep = new LocalBarkeep();
//     return barkeep;
//   } else {
//     throw new TavernError('Invalid mode');
//   }
// }

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
