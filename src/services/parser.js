import _ from 'lodash';
import { createCustomError } from '../utils';

const ParserError = createCustomError('ParserError');

export default class Parser {
  parseRequest = ({ req }) => {
    const {
      path,
      method,
      body,
      query
    } = req;

    if (path === undefined || method === undefined) {
      throw new ParserError('Request does not contain path and method');
    }

    const plainUrl = _.trim(path, '/');
    const action = `${method}:${plainUrl}`.toUpperCase();
    return {
      type: 'PARSED_REQUEST',
      payload: {
        type: action,
        payload: { ...body, ...query }
      }
    };
  }

  subscriptions = {
    PARSE_REQUEST: this.parseRequest
  }
}
