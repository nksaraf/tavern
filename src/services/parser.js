import _ from 'lodash';

const entities = [ 'user' ];

const crudMethodToAction = {
	GET: 'GET',
	POST: 'CREATE',
	PUT: 'UPDATE',
	DELETE: 'DELETE'
}

/*
	Get user				user			GET			query
	Create user			user			POST		body
	Update user			user 			PUT			body
	Delete user			user			DELETE	body
	Get all users		users			GET			

	Check in				checkIn		POST		body
	Check out				checkOut	POST		body

	Login						login			POST		body
*/

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