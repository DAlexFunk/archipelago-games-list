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

export { DB_connect, DB_getAllGames, DB_getUserSteamGames };
