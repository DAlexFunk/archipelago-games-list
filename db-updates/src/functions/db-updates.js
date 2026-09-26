const { app } = require("@azure/functions");
const { MongoClient } = require("mongodb");
const SHEETS_getSheetData = require("../sheets.js");
const { IGDB_getIgdbInfoByName, IGDB_getIgdbInfoByID } = require("../igdb.js");

const client = new MongoClient(process.env.MONGO_CONNECTION);
const archi_games = client.db("archipelago").collection("archipelago-games");

/**
 * Refreshes the list of games from the spreadsheet and adds IGDB info for any new games
 */
app.timer("refresh-games-list", {
	schedule: "0 0 0 * * *",
	handler: async (myTimer, context) => {
		context.log("Refreshing the games list");

		const games = await SHEETS_getSheetData(context);

		if (games === false) {
			context.error("Failed to get sheet data");
			return;
		}

		const operations = games?.map((game) => ({
			updateOne: {
				filter: { name: game.name },
				update: {
					$set: {
						stability: game.stability,
						pr_status: game.pr_status,
						rating: game.rating,
						disclosure: game.disclosure,
						links: game.links,
						setup: game.setup,
						support: game.support,
						comments: game.comments,
					},
				},
				upsert: true,
			},
		}));

		if (operations && operations.length > 0) {
			try {
				const result = await archi_games.bulkWrite(operations);
				context.log(`Matched: ${result.matchedCount}`);
				context.log(`Modified: ${result.modifiedCount}`);
				context.log(`Upserted: ${result.upsertedCount}`);
			} catch (error) {
				context.error(`Could not update games: ${error}`);
				return;
			}
		}

		// Add IGDB data for any upserted games
		const new_games = await archi_games.find({ igdb_id: { $exists: false } }).toArray();
		if (new_games.length !== 0) {
			context.log("Found games without an igdb id");
			try {
				let operations = await rateLimitedMap(
					new_games,
					async (game) => {
						const igdb_data = await IGDB_getIgdbInfoByName(game.name);
						if (!igdb_data) return null;

						return {
							updateOne: {
								filter: { _id: game._id },
								update: {
									$set: {
										igdb_id: igdb_data.id,
										platforms: igdb_data.platforms?.map((platform) => platform.name) ?? [],
										last_igdb_refresh: new Date(),
									},
								},
							},
						};
					},
					3,
				);

				operations = operations.filter((operation) => operation !== null);

				if (operations.length === 0) {
					context.log("No operations to perform");
					return;
				}

				await archi_games.bulkWrite(operations);
				context.log(`Updated ${operations.length} entries with IGDB data`);
			} catch (error) {
				context.log(`Failed to update IGDB data: ${error}`);
			}
		}
	},
});

/**
 * Refreshes IGDB data for any games with outdated data
 * Outdated is considered 30 days old or more
 */
app.timer("refresh-platforms", {
	schedule: "0 0 2 * * 3",
	handler: async (myTimer, context) => {
		context.log("Refreshing IGDB data");
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		// Get past due records
		let old_games;
		try {
			// Sorts by oldest
			old_games = await archi_games
				.find({ last_igdb_refresh: { $exists: true, $lt: thirtyDaysAgo } })
				.sort({ last_igdb_refresh: 1 })
				.limit(200) // Staggers the data collection
				.toArray();
		} catch (error) {
			context.error(`Failed to get game data: ${error}`);
			return;
		}

		if (old_games.length === 0) {
			context.log("No games to update");
			return;
		}

		context.log(`Updating ${old_games.length} game(s)`);

		let operations = await rateLimitedMap(
			old_games,
			async (game) => {
				try {
					if (!game.igdb_id) {
						context.log(`${game.name} has no igdb_id`);
						return null;
					}

					const igdb_data = await IGDB_getIgdbInfoByID(game.igdb_id, context);
					context.log(`Got data for ${game.name}`);

					return {
						updateOne: {
							filter: { _id: game._id },
							update: {
								$set: {
									platforms: igdb_data.platforms?.map((platform) => platform.name) ?? [],
									last_igdb_refresh: new Date(),
								},
							},
						},
					};
				} catch (error) {
					context.error(`Failed to get data IGDB data for game ${game.name}: ${error}`);
					return null;
				}
			},
			3,
		);

		operations = operations.filter((operation) => operation !== null);

		if (operations.length === 0) {
			context.log("No operations to perform");
			return;
		}

		try {
			const result = await archi_games.bulkWrite(operations);
			context.log(`Matched: ${result.matchedCount}`);
			context.log(`Modified: ${result.modifiedCount}`);
		} catch (error) {
			context.error(`Failed to update games: ${error}`);
		}
	},
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rateLimitedMap(games, fn, requestsPerSecond, context) {
	const interval = 1000 / requestsPerSecond;
	const results = [];

	for (const game of games) {
		const result = await fn(game);
		results.push(result);
		await delay(interval);
	}

	return results;
}
