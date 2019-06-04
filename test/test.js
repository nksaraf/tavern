import tavern, { RequestHandler, ExpressAdapter, Logger, Parser, createCustomError } from '../src';
// import test from 'ava';

const UserError = createCustomError('UserError');
const barkeep = tavern();
barkeep.register([Logger, RequestHandler, ExpressAdapter, Parser]);
// barkeep.register(Logger);

barkeep.use('GET:USER', function({ id }) {
  const numId = Number(id);
	if (numId === 1) {
		return this.msg('USER', { name: 'Stephen Curry' });
	} else {
		return this.error(new UserError(`${id} is hella wrong`));
	}
})

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

const id = 2;
barkeep.listen();
// barkeep.ask(GET({ path: '/user', body: { id }}));
// barkeep.ask(GET({ body: { id }}));
//barkeep.listen();
// barkeep.ask(barkeep.extensions.msg('PARSE_REQUEST', { req: { path: '/user', body: { id }, method: 'GET' } }));