import LocalBarkeep from './local_barkeep';
import { TavernError, makeErrorMessage, isErrorMessage, createCustomError } from './error';
import { makeMessage } from './utils';
import { AbstractBarkeep, Barkeep } from './barkeep';
import { BaseService } from './service';
import { match } from './matcher';

import _ from 'lodash';

interface TavernOptions {
  mode?: string;
  logger?: boolean;
}

const defaultOptions = {
  mode: 'local',
  logger: true
}

/**
 * Factory function to create an instance of {@link Barkeep}
 * @return barkeep
 */
function tavern(options: TavernOptions = {}) : Barkeep {
  const args = _.defaults(options, defaultOptions);
  if (args.mode === 'local') {
    const barkeep = new LocalBarkeep();
    return barkeep;
  } else {
    throw new TavernError('Invalid mode');
  }
}

tavern.Service = BaseService;
tavern.msg = makeMessage;
tavern.error = makeErrorMessage;
tavern.isError = isErrorMessage;
tavern.match = match;
tavern.createCustomError = createCustomError;
tavern.LocalBarkeep = LocalBarkeep;
tavern.AbstractBarkeep = AbstractBarkeep;

export default tavern;
