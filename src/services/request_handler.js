export default class RequestHandler {
  handleRequest = async ({ req }) => {
    const parsedRequest = await this.barkeep.ask({
      type: 'PARSE_REQUEST',
      payload: { req }
    });
    if (this.isError(parsedRequest)) {
      return parsedRequest;
    }
    const action = { ...parsedRequest.payload, ctx: { req } };
    const response = await this.barkeep.ask(action);
    return this.msg('RESPONSE', response, { request: action });
  }

  subscriptions = {
    HANDLE_REQUEST: this.handleRequest
  }
}
