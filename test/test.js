

import tavern, { RequestHandler, ExpressAdapter, Logger, Parser, createCustomError } from '../src/tavern';
// // import test from 'ava';
//
//
const UserError = createCustomError('UserError');
const barkeep = tavern();
barkeep.register(Logger, RequestHandler, ExpressAdapter, Parser);

barkeep.use('GET:USER', ({ id }, c, t, api) => {
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

const getRequest = (req) => {
  return {
    type: 'HANDLE_REQUEST',
    payload: {
      req
    }
  }
}

export const GET = (req) => {
  req.method = 'GET';
  return getRequest(req);
}

export const POST = (req) => {
  req.method = 'POST';
  return getRequest(req);
}

const id = 1;
// barkeep.listen();
(async () => {
  await barkeep.ask(GET({ path: '/user', body: { id } }));
  await barkeep.ask(GET({ body: { id }, path: '/user/' }));
})();
// barkeep.listen();
// barkeep.ask(barkeep.msg('PARSE_REQUEST', { req: { path: '/user', body:
//  { id }, method: 'GET' } }));
