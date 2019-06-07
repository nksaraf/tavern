import LocalBarkeep from './local_barkeep';
import { TavernError } from './error';
import { Barkeep } from './barkeep';
import _ from 'lodash';

interface TavernOptions {
  mode?: string;
}

const defaultOptions = {
  mode: 'local'
}

/**
 * Factory function to create an instance of {@link Barkeep}
 * @module tavern
 * @return barkeep
 */
function tavern(options: TavernOptions = {}): Barkeep {
  const args = _.defaults(options, defaultOptions);
  if (args.mode === 'local') {
    return new LocalBarkeep();
  } else {
    throw new TavernError('Invalid mode');
  }
}

export default tavern;
export { AbstractBarkeep } from './barkeep';
export { BaseService } from './service';
export { createCustomError } from './error';
export { Message } from './types';
export { LocalBarkeep };
export * from './services';

