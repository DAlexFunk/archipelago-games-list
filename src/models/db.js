import { MongoClient } from "mongodb";
import { API_areGamesSame, API_getSteamGames } from "./api.js";

const client = new MongoClient(process.env.MONGO_CONNECTION);
const archi_games = client.db("archipelago").collection("archipelago-games");

/**
 * Connects to the Mongo database
 */
async function DB_connect() {
	await client.connect();
}

/**
 * Gets all of the games in the db sorted by stability then name
 * @returns {Promise<Object[]>} All of the games in the db
 */
async function DB_getAllGames() {
	const games = await archi_games.find({}).toArray();
	return (
		games
			// Sorts in alphabetical order ignoring and that start with "A", "An", or "The"
			.sort((game1, game2) => {
				const remove_a_or_the_or_an = (name) => name.replace(/^(a|an|the)\s+/i, "");

				return remove_a_or_the_or_an(game1.name).localeCompare(remove_a_or_the_or_an(game2.name));
			})
			// Sorts stability into Stable -> Unstable -> Broken on Main
			.sort((game1, game2) => {
				const games_map = {
					Stable: 1,
					Unstable: 2,
					"Broken on Main": 3,
				};

				return games_map[game1.stability] - games_map[game2.stability];
			})
	);
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

export { DB_connect, DB_getAllGames, DB_getUserSteamGames };
