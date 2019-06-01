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
		return this.error('WATCHA DOING');
		const { path, method, body, query } = req;

		const parts = _.split(_.trim(path, '/'), '/');
		const main = parts[0];

		let action;
		if (entities.includes(main.toLowerCase())) {
			action = `${crudMethodToAction[method]}_${main.toUpperCase()}`
		} else if (method === 'GET') {
			action = `GET_${main.toUpperCase()}`
		} else if (method === 'POST') {
			action = _.snakeCase(main).toUpperCase();
		} else {
			return this.error('Unsupported method', 404);
		}

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