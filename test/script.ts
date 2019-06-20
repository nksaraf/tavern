import tavern, { Logger, Parser, RequestHandler, ExpressAdapter } from '../src';
import express from 'express';
// import ParserObject from './parser';

// const UserError = tavern.createCustomError('UserError');

// class StupidBarkeep extends tavern.LocalBarkeep {
//   async ask(message, payload = {}, ctx = {}) {
//     const msg = this.msg(message, payload, ctx);
//     console.log('Asked', msg);
//     return await tavern.LocalBarkeep.prototype.ask.call(this, msg);
//   }

//   tell(message, payload, ctx) {
//     const msg = this.msg(message, payload, ctx);
//     console.log('Told', msg);
//     return tavern.LocalBarkeep.prototype.tell.call(this, msg);
//   }
// }

// const stupid = new StupidBarkeep();

const app = express();
app.use(express.json());
app.use(express.urlencoded());

tavern.register(Logger, Parser, RequestHandler, new ExpressAdapter(app));

tavern.use('GET:USER', ({ id }, c, t, api) => {
  const numId = Number(id);
  if (numId === 2) {
    return api.msg('USER', { name: 'Klay Thompson' });
  }
});

tavern.use('GET:USER', ({ id }, c, t, api) => {
  const numId = Number(id);
  if (numId === 1) {
    return api.msg('USER', { name: 'Stephen Curry' });
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

const GET = (req: { path?: string; body?: { id: number; } | { id: number; }; method?: any; }) => {
  req.method = 'GET';
  return getRequest(req);
};

const POST = (req: { method: string; }) => {
  req.method = 'POST';
  return getRequest(req);
};

const id = 1;
(async () => {
  await tavern.ask(GET({ path: '/user', body: { id } }));
})();

// tavern.listen();
