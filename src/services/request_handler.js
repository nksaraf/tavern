export default class RequestHandler {
	handleRequest = async ({ req }) => {
		const parsedRequest = await this.barkeep.ask({
			type: 'PARSE_REQUEST',
			payload: { req: req }
		});
		if (this.isError(parsedRequest)) { 
			return parsedRequest 
		};
		const action = { ...parsedRequest.payload, ctx: { req }};
		const response = await this.barkeep.ask(action);
		response.ctx.private = true;
		response.ctx.action = action.type;
		return response;
	}

	subscriptions = {
		'HANDLE_REQUEST': this.handleRequest
	}
}