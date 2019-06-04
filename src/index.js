/**
 * @module tavern
 */

import Barkeep from './barkeep';
import types from './types';

/**
 * Factory function to create an instance of {@link Barkeep}
 * @module tavern
 * @return {Barkeep} barkeep
 */
const tavern = () => new Barkeep();

export default tavern;
export { default as Barkeep } from './barkeep';
export {
  Logger, ExpressAdapter, RequestHandler, Parser
} from './services';
export { createCustomError } from './utils';
