export { default as Barkeep } from './barkeep';

import Barkeep from './barkeep';
export default () => {
  return new Barkeep();
}

export * from './services';