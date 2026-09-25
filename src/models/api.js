/**
 * Normalizes the name of a game by removing special characters, accents, and whitespace and turns it lowercase
 * @param {string} game Game name to be normalized
 * @returns {string} Normalized game name
 */
function normalize(game) {
	return game
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

/**
 * Fuzzy matches the names of 2 game to determine if they are the same
 * @param {string} game1 The name of the first game
 * @param {string} game2 The name of the second game
 * @returns {boolean} Whether or not the names are considered the same
 */
function API_areGamesSame(game1, game2) {
	const a = normalize(game1);
	const b = normalize(game2);
	if (a === b) return true;

	// Fuzzy searching:
	const short = a.length < b.length ? a : b;
	const long = a.length < b.length ? b : a;

	// Don't check super short substrings
	if (short.length < 5) return false;

	return long.includes(short);
}

/**
 * Gets the names of the games a given steam user owns
 * @param {string} steamid The 17-digit steam id of the account to get the games of
 * @returns {Promise<string[]>} The names of the games that user owns
 */
async function API_getSteamGames(steamid) {
	const raw_steam_games = await fetch(
		`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_KEY}&steamid=${steamid}&format=json&include_appinfo=1&include_played_free_games=1`,
		{ signal: AbortSignal.timeout(5000) },
	);

	const contentType = raw_steam_games.headers.get("content-type");
	if (!raw_steam_games.ok || !contentType || !contentType.includes("application/json")) {
		throw new Error(`Failed to get steam data with HTTP ${raw_steam_games.status}`);
	}

	const raw_data = await raw_steam_games.json();
	const games = raw_data?.response?.games ?? [];

	return games.map((game) => normalize(game.name)) ?? [];
}

export { API_areGamesSame, API_getSteamGames };
