import tavern, { RequestHandler, ExpressAdapter, Logger, Parser } from './src';

const barkeep = tavern();
barkeep.register([Logger, RequestHandler, ExpressAdapter, Parser]);

barkeep.use('GET:USER', ({ id }) => {
	if (id === 1) {
		return barkeep.extensions.msg('USER', { name: 'Nikhil Saraf' });
	} else {
		return barkeep.extensions.error('HELLA WRONG');
	}
})

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
barkeep.ask(GET({ path: '/user', body: { id }}));