import express from "express";
import path from "node:path";
import { SHEETS_DATA_VALUES, getSheetData, areGamesSame, getSteamGames } from "./models.js";
const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));
app.use(express.static(path.join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use("/", async (req, res) => {
	let sheet_data = await getSheetData();
	if (req.body?.steamid) {
		const steam_games = await getSteamGames(req.body.steamid);
		sheet_data = sheet_data.filter((game) => steam_games.some((game2) => areGamesSame(game.values[SHEETS_DATA_VALUES.NAME].formattedValue, game2)));
	}
	res.render("index", { games: sheet_data, GAMES_ENUM: SHEETS_DATA_VALUES });
});

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
