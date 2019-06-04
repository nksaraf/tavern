import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import morgan from 'morgan';

export default class ExpressAdapter {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(morgan('common'));
  }

  middleware = async (req, res, next) => {
    console.log();
    const reqPayload = {
      path: req._parsedUrl.pathname,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers
    };
    const { type, payload, ctx } = await this.barkeep.ask({
      type: 'HANDLE_REQUEST',
      payload: { req: reqPayload }
    });

    let response;
    if (!this.match(type, 'RESPONSE')) {
      response = payload;
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
      const server = http.createServer(this.app);
      await server.listen(process.env.PORT || 5000);
      this.barkeep.tell('LOG', { message: `🚀 Serving at http://:::${process.env.PORT || 5000}/` });
    } catch (error) {
      this.barkeep.tell(this.error(error.message));
    }
  }

  subscriptions = {
    LISTEN: this.listen
  }
}
