// SHEETS SECTION
const SHEETS_DATA_VALUES = Object.freeze({
	NAME: 0,
	STABILITY: 1,
	PR_STATUS: 2,
	RATING: 3,
	LINKS: 4,
	SETUP: 5,
	SUPPORT: 6,
	DISCLOSURES: 7,
});

/**
 * Gets the row data from the spreadsheet
 * @returns {Promise<Object[]>} The rows of the spreadsheet
 */
async function API_getSheetData() {
	const SHEET_ID = "1iuzDTOAvdoNe8Ne8i461qGNucg5OuEoF-Ikqs8aUQZw";
	const SHEET_RANGE = "'Playable Worlds'!A:H";
	const SHEET_FIELDS = "sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link(uri)))))))";

	const raw_sheet_res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${process.env.SHEETS_KEY}&ranges=${SHEET_RANGE}&fields=${SHEET_FIELDS}`);
	const raw_data = await raw_sheet_res.json();

	// Get the part we need (we do not need the first 2 rows)
	let sheet_data = raw_data.sheets[0].data[0].rowData.slice(2);

	// Filter null rows
	sheet_data = sheet_data.filter((row) => Object.keys(row.values[0]).length !== 0);

	return sheet_data;
}

// STEAM SECTION
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
	);
	const raw_data = await raw_steam_games.json();

	return raw_data.response.games.map((game) => normalize(game.name));
}

/**
 * Gets the IGDB data for a specific game. Gets the IGDB id and the platforms
 * @param {String} game_name The name of the game to get the data for
 * @returns {Promise<Object[]>} The IGDB data for each game
 */
async function API_getIgdbInfo(game_name) {
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	for (let attempt = 0; attempt < 5; attempt++) {
		let raw_data = await fetch("https://api.igdb.com/v4/games", {
			method: "POST",
			headers: {
				"Client-ID": process.env.IGDB_CLIENT_ID,
				Authorization: `Bearer ${process.env.IGDB_ACCESS_TOKEN}`,
			},
			body: `fields name, platforms.name, total_rating_count;search "${game_name}";`,
		});

		if (raw_data.status !== 429) {
			const data = await raw_data.json();
			if (data?.length === 0 && game_name.at(-1) === ")") {
				// If we got back an empty response and the name ends with some context in parens, try again without the parens
				game_name = game_name.replace(/\s*\(.*?\)/g, "").trim();
				continue;
			}

			if (data?.length !== 0) {
				// Return the game with the highest total ratings, hopefully that is our game
				return data.reduce((max, game) => ((game.total_rating_count ?? 0) > (max.total_rating_count ?? 0) ? game : max));
			} else {
				return [];
			}
		}

		const retryAfter = Number(response.headers.get("Retry-After")) || 2;

		await delay(retryAfter * 1000);
	}

	throw new Error("Too many retries");
}

export { SHEETS_DATA_VALUES, API_getSheetData, API_areGamesSame, API_getSteamGames, API_getIgdbInfo };
