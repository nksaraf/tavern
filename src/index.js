/**
 * @module tavern
 */

import Barkeep from './barkeep';

/**
 * Factory function to create an instance of {@link Barkeep}
 * @module tavern
 * @return {Barkeep} barkeep
 */
const tavern = () => {
	return new Barkeep();
}

export default tavern;

export { default as Barkeep } from './barkeep';
export * from './services';
export * from './utils';