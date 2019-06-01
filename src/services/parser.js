export default class Parser {
	parseRequest = async ({ req }) => {
		const { path, method, body, query } = req;

		const plainUrl = _.trim(path, '/');
		const action = `${method}:${plainUrl}`.toUpperCase();
		return {
			type: 'PARSED_REQUEST',
			payload: {
				type: action,
				payload: { ...body, ...query }
			}
		}
	}

	subscriptions = {
		'PARSE_REQUEST': this.parseRequest
	}
}