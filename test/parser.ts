import _ from 'lodash';
import tavern, { Dict, Messenger } from '../src';

const ParserError = tavern.createCustomError('ParserError');

interface ParserPayload extends Dict {
  req?: TRequest;
}

interface TRequest {
  path: string;
  method: string;
  body?: object;
  query?: object;
}

const Parser = {
  PARSE_REQUEST: ({ req }: ParserPayload, ctx: Dict, type: string, barkeep: Messenger) => {
    if (req === undefined) {
      return barkeep.error(new ParserError('Invalid request'));
    }

    const {
      path,
      method,
      body,
      query
    } = req;

    const plainUrl = _.trim(path, '/');
    const action = `${method}:${plainUrl}`.toUpperCase();
    return barkeep.msg('PARSED_REQUEST', barkeep.msg(action, { ...body, ...query }));
  }
};

export default Parser;
