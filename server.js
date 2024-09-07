require('dotenv').config();
const express = require('express');
const { buildSchema } = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');
const axios = require('axios');

const PODCHASER_API_KEY = process.env.PODCHASER_API_KEY;
const PODCHASER_API_URL = process.env.PODCHASER_API_URL;

// Define your GraphQL schema with more complex queries for sorting, pagination, etc.
const schema = buildSchema(`
    type Query {
        searchPodcasts(query: String!): [Podcast]
    }

	type Podcast {
		title: String
		description: String
	}
`);

// Resolver functions
const root = {
	searchPodcasts: async ({ query }) => {
		try {
			const response = await axios.post(
				PODCHASER_API_URL,
				{
					query: `
						query searchPodcasts($query: String!) {
							podcasts(searchTerm: $query) {
								data {
									title
									description
								}
							}
						}
					`,
					variables: { query },
				},
				{
					headers: {
						Authorization: `Bearer ${PODCHASER_API_KEY}`,
					},
				}
			);

			const podcasts = response.data.data.podcasts.data;
			if (!podcasts) {
				throw new Error('Podcasts field is undefined in the API response');
			}
			return podcasts;

		} catch (error) {
			throw new Error('Failed to fetch podcasts from Podchaser API');
		}
	},
};

const app = express();

app.get('/graphiql', (req, res) => {
	res.send(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>GraphiQL</title>
			<link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
		</head>
		<body style="margin: 0;">
			<div id="graphiql" style="height: 100vh;"></div>

			<script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
			<script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
			<script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>

			<script>
				const graphQLFetcher = graphQLParams =>
					fetch('/graphql', {
						method: 'post',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(graphQLParams),
					}).then(response => response.json());

				ReactDOM.render(
					React.createElement(GraphiQL, { fetcher: graphQLFetcher }),
					document.getElementById('graphiql'),
				);
			</script>
		</body>
		</html>
	`);
});

app.use(
	'/graphql',
	createHandler({
		schema: schema,
		rootValue: root,
		pretty: true,
	})
);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
