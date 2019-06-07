import http from 'http';
import morgan from 'morgan';
import express from 'express';

import { BaseService, Message } from '../tavern';

interface TRequest {
  path: string; 
  method: string;
  body: object;
  query: object;
  headers: http.IncomingHttpHeaders;
}

interface TResponsePayload {
  status: number;
  [key: string]: any
}

interface TResponseCtx {
  request: string;
  [key: string]: any
}

export default class ExpressAdapter extends BaseService {
  app: express.Express;

  constructor() {
    super();
    this.app = express();
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());
    this.app.use(morgan('common'));
  }

  middleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log();
    const tRequest: TRequest = {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers
    };

    const { type, payload, ctx } = await this.barkeep.ask('HANDLE_REQUEST', { req: tRequest });

    let response: Message;
    if (!this.match(type, 'RESPONSE')) {
      response = (payload as Message);
    } else {
      response = { type, payload, ctx };
    }

    const status = (response.payload as TResponsePayload).status || (this.isError(response.type) ? 400 : 200);
    res.status(status).json({
      ...response.payload,
      action: (response.ctx as TResponseCtx).request,
      type: response.type
    });
    next();
  }

  listen = async () => {
    try {
      this.app.use(this.middleware);
      const server = http.createServer(this.app);
      await server.listen(process.env.PORT || 5000);
      return this.barkeep.tell('LOG', { message: `🚀 Serving at http://:::${process.env.PORT || 5000}/` });
    } catch (error) {
      return this.barkeep.tell(this.error(error.message));
    }
  }

  subscriptions = {
    LISTEN: this.listen
  }
}
