import http from 'http';
import express from 'express';

import tavern from '../tavern';
import { Message } from '../types';

interface TRequest {
  path: string;
  method: string;
  body?: object;
  query?: object;
  headers?: http.IncomingHttpHeaders;
}

export default class ExpressAdapter extends tavern.Service {
  app: express.Express;

  constructor(app: express.Express) {
    super();
    this.app = app;
  }

  middleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log();
    const tRequest: TRequest = {
      // TODO: parse url properly (from express)
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers
    };

    const { type, payload, ctx } = await this.ask('HANDLE_REQUEST', { req: tRequest });

    let response: Message;
    if (!this.match(type, 'RESPONSE')) {
      response = (payload as Message);
    } else {
      response = { type, payload, ctx };
    }

    const status = response.payload.status || (this.isError(response.type) ? 400 : 200);
    res.status(status).json({
      ...response.payload,
      action: response.ctx.request,
      type: response.type
    });
    next();
  }

  listen = async () => {
    try {
      this.app.use(this.middleware);
      await this.app.listen(process.env.PORT || 5000);
      return this.tell('LOG', { message: `🚀 Serving at http://:::${process.env.PORT || 5000}/` });
    } catch (error) {
      return this.tell(this.error(error.message));
    }
  }

  subscriptions = {
    LISTEN: this.listen
  }
}
