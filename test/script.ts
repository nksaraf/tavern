import tavern, { Logger, Parser, RequestHandler } from '../src';
import ParserObject from './parser';

const UserError = tavern.createCustomError('UserError');

const barkeep = tavern();

class StupidBarkeep extends tavern.LocalBarkeep {
  async ask(message, payload = {}, ctx = {}) {
    const msg = this.msg(message, payload, ctx);
    console.log('Asked', msg);
    return await tavern.LocalBarkeep.prototype.ask.call(this, msg);
  }

  tell(message, payload, ctx) {
    const msg = this.msg(message, payload, ctx);
    console.log('Told', msg);
    return tavern.LocalBarkeep.prototype.tell.call(this, msg);
  }
}

const stupid = new StupidBarkeep();

stupid.register(RequestHandler, ParserObject);
// barkeep.register(Logger, RequestHandler, Parser);

stupid.use('GET:USER', ({ id }, c, t, api) => {
  const numId = Number(id);
  if (numId === 1) {
    return api.msg('USER', { name: 'Klay Thompson' });
  } else {
    return api.error(new UserError(`${id} is hella wrong`));
  }
});

barkeep.use('GET:USER', ({ id }, c, t, api) => {
  const numId = Number(id);
  if (numId === 1) {
    return api.msg('USER', { name: 'Stephen Curry' });
  } else {
    return api.error(new UserError(`${id} is hella wrong`));
  }
});

console.log();

const getRequest = (req: any) => ({
  type: 'HANDLE_REQUEST',
  payload: {
    req
  },
  ctx: {}
});

export const GET = (req: { path?: string; body?: { id: number; } | { id: number; }; method?: any; }) => {
  req.method = 'GET';
  return getRequest(req);
};

export const POST = (req: { method: string; }) => {
  req.method = 'POST';
  return getRequest(req);
};

const id = 1;
// barkeep.listen();
(async () => {
  // await barkeep.ask(GET({ path: '/user', body: { id } }));
  await stupid.ask(GET({ path: '/user', body: { id } }));
  // await barkeep.ask(GET({ body: { id }, path: '/user/' }));
})();


// barkeep.listen();
// barkeep.ask(barkeep.msg('PARSE_REQUEST', { req: { path: '/user', body:
//  { id }, method: 'GET' } }));
