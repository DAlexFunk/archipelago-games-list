import { MongoClient } from "mongodb";
import { SHEETS_DATA_VALUES, API_getSheetData, API_areGamesSame, API_getSteamGames, API_getIgdbInfo } from "./api.js";

const client = new MongoClient(process.env.MONGO_CONNECTION);
const archi_games = client.db("archipelago").collection("archipelago-games");

/**
 * Connects to the Mongo database
 */
async function DB_connect() {
	await client.connect();
}

/**
 * Takes the object with links from the sheets api and reformats them for the db
 * @param {Object} links_obj The sheets api object representing the cell with the links
 * @returns {Object[]} The reformatted links
 */
function formatLinks(links_obj) {
	const links_text = links_obj.formattedValue?.split(", ");
	if (!links_text) return [];

	let retval = [];
	if (links_text.length === 1) {
		retval.push({ text: links_obj.formattedValue, uri: links_obj.hyperlink });
	} else {
		let links_found = 0;
		links_obj.textFormatRuns.forEach((link) => {
			if (link.format.link) {
				retval.push({ text: links_text[links_found], uri: link.format.link.uri });
				links_found++;
			}
		});
	}

	return retval;
}

/**
 * Fills the db with the values from the sheets api
 */
async function DB_fillDatabase() {
	await archi_games.deleteMany({}); // Clear the current data

	const sheet_data = await API_getSheetData();

	// Process the data to store better in the database
	const games_data = [];
	sheet_data.forEach((game) => {
		let game_obj = {};
		game_obj.name = game.values[SHEETS_DATA_VALUES.NAME].formattedValue ?? null;
		game_obj.stability = game.values[SHEETS_DATA_VALUES.STABILITY].formattedValue ?? null;
		game_obj.pr_status = game.values[SHEETS_DATA_VALUES.PR_STATUS].formattedValue ?? null;
		game_obj.rating = game.values[SHEETS_DATA_VALUES.RATING].formattedValue ?? null;
		game_obj.disclosure = game.values[SHEETS_DATA_VALUES.DISCLOSURES].formattedValue ?? null;
		game_obj.links = formatLinks(game.values[SHEETS_DATA_VALUES.LINKS]);
		game_obj.setup = formatLinks(game.values[SHEETS_DATA_VALUES.SETUP]);
		game_obj.support = formatLinks(game.values[SHEETS_DATA_VALUES.SUPPORT]);
		games_data.push(game_obj);
	});

	await archi_games.insertMany(games_data);
}

/**
 * Gets all of the games in the db
 * @returns {Promise<Object[]>} All of the games in the db
 */
async function DB_getAllGames() {
	return await archi_games.find({}).toArray();
}

/**
 * Gets all of the given user's steam games in the database
 * @param {String} steamid The steamid to get the games for
 * @returns {Promise<Object[]>} The steam games for the given steamid
 */
async function DB_getUserSteamGames(steamid) {
	const games = await DB_getAllGames();
	const steam_games = await API_getSteamGames(steamid);
	return games.filter((game1) => steam_games.some((game2) => API_areGamesSame(game1.name, game2)));
}

async function rateLimitedMap(games, fn, requestsPerSecond) {
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const interval = 1000 / requestsPerSecond;
	const results = [];

	for (const game of games) {
		const result = await fn(game);
		results.push(result);
		console.log(`Got info for ${game.name}`);
		await delay(interval);
	}

	return results;
}

async function DB_getIgdbData() {
	const db_data = await DB_getAllGames();

	const operations = await rateLimitedMap(
		db_data,
		async (game) => {
			const igdb_data = await API_getIgdbInfo(game.name);

			return {
				updateOne: {
					filter: { _id: game._id },
					update: {
						$set: {
							igdb_id: igdb_data.id,
							platforms: igdb_data.platforms,
						},
					},
				},
			};
		},
		3,
	);

	archi_games.bulkWrite(operations);
	console.log("Success");
}

export { DB_connect, DB_fillDatabase, DB_getAllGames, DB_getUserSteamGames, DB_getIgdbData };
