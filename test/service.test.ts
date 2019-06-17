import { BaseService } from '../src/service';

describe('base service', () => {
  class DumbService extends BaseService {
    subscriptions = {
      '*': console.log,
    }
  }

  const service = new DumbService();

  test('util method: msg', () => {
    expect(service.msg('Hello', { a: 1 }, { b: 1 })).toEqual({
      type: 'HELLO',
      payload: { a: 1 },
      ctx: { b: 1 }
    });
    expect(service.msg({ type: 'Hello', payload: { a: 1 } }, { a: 2 }, { b: 1 })).toEqual({
      type: 'HELLO',
      payload: { a: 1 },
      ctx: { b: 1 }
    });
  });

  // test('util method: error', () => {
  //   expect(service.error('Hello', { a: 1 }, { b: 1 })).toEqual({
  //     type: 'HELLO',
  //     payload: { a: 1 },
  //     ctx: { b: 1 }
  //   });
  // });
});
