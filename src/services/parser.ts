import _ from 'lodash';
import { BaseService, Dict, createCustomError } from '../tavern';

const ParserError = createCustomError('ParserError');

interface ParserPayload extends Dict {
  req?: TRequest;
}

interface TRequest {
  path: string;
  method: string;
  body?: object;
  query?: object;
}

export default class Parser extends BaseService {
  parseRequest = ({ req }: ParserPayload) => {
    if (req === undefined) {
      return this.error(new ParserError('Invalid request'));
    }

    const {
      path,
      method,
      body,
      query
    } = req;

    const plainUrl = _.trim(path, '/');
    const action = `${method}:${plainUrl}`.toUpperCase();
    return this.msg('PARSED_REQUEST', this.msg(action, { ...body, ...query }));
  }

  subscriptions = {
    PARSE_REQUEST: this.parseRequest
  }
}