import { fetchGraphQL, Query, Variables, GraphQLTaggedNode } from "magiql/node";

export const fetchHasuraGraphQL = async <TQuery extends Query>(
  query: GraphQLTaggedNode | string,
  variables: Variables<TQuery>
) => {
  const { data, error } = await fetchGraphQL<TQuery>({
    query,
    variables,
    endpoint: `${process.env.HASURA_GRAPHQL_ENDPOINT}/v1/graphql`,
    fetchOptions: {
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
      },
    },
  });
  if (data) {
    return data;
  } else {
    throw error;
  }
};

import request from "isomorphic-unfetch";

export async function hasuraQuery(commands) {
  const response = await request(
    process.env.HASURA_GRAPHQL_ENDPOINT + "/v1/query",
    {
      method: "POST",
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
      },
      body: JSON.stringify({
        type: "bulk",
        args: commands,
      }),
    }
  );
  const data = await response.json();
  if (response.status === 200 && Array.isArray(data)) {
    return commands.map((command, i) => ({
      id: command.id,
      response: data[i],
    }));
  } else {
    return [];
  }
}
