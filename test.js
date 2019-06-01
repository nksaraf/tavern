import Barkeep from './src';
import { RequestHandler, ExpressAdapter, Logger, Parser } from './src/services';

const barkeep = Barkeep();
barkeep.register([Logger, RequestHandler, ExpressAdapter, Parser]);

barkeep.use('GET_USER', ({ id }) => {
	if (id === 1) {
		return 'SUCCESS'
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

barkeep.ask(GET({ path: '/user' }));
barkeep.as