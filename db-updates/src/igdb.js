const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets a game's data based on the name. Returns the most reviewed game if multiple return
 * @param {string} game_name The name of the game to search for
 * @returns {Promise<Object>} The most likely candidate result from the search
 */
module.exports.IGDB_getIgdbInfoByName = async function (game_name) {
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
				return {};
			}
		}

		const retryAfter = Number(response.headers.get("Retry-After")) || 2;

		await delay(retryAfter * 1000);
	}

	throw new Error("Too many retries");
};

/**
 * Gets a game's IGDB data based on its id
 * @param {Number} game_id The IGDB id to filter for
 * @returns {Promise<object>} The requested game's data
 */
module.exports.IGDB_getIgdbInfoByID = async function (game_id, context) {
	for (let attempt = 0; attempt < 5; attempt++) {
		let raw_data = await fetch("https://api.igdb.com/v4/games", {
			method: "POST",
			headers: {
				"Client-ID": process.env.IGDB_CLIENT_ID,
				Authorization: `Bearer ${process.env.IGDB_ACCESS_TOKEN}`,
			},
			body: `fields name, platforms.name, total_rating_count;where id = ${game_id};`,
		});

		const contentType = raw_data.headers.get("content-type");
		if (raw_data.ok && contentType && contentType.includes("application/json")) {
			const data = await raw_data.json();
			return data[0];
		}

		const retryAfter = Number(raw_data.headers.get("Retry-After")) || 2;

		await delay(retryAfter * 1000);
	}

	throw new Error("Too many retries");
};
