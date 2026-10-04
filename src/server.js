import express from "express";
import path from "node:path";
import { DB_connect, DB_getAllGames, DB_getUserSteamGames } from "./models/db.js";
import { API_getSteamNames } from "./models/api.js";
const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));
app.use(express.static(path.join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api", (req, res) => {
	res.json({ message: "works" });
});

app.use("/", async (req, res) => {
	try {
		// Removes empty entries and filters for only unique ids to prevent checking the same user many times
		const steamids = [...new Set(req.body?.steamids?.filter((id) => id !== "") ?? [])];
		const games = steamids.length > 0 ? await DB_getUserSteamGames(steamids) : await DB_getAllGames();
		res.render("index", { games, steaminfo: await API_getSteamNames(steamids) });
	} catch (error) {
		console.error(`Failed to retrive games: ${error.message}`);
		res.status(500).render("index", { games: null, steaminfo: null });
	}
});

(async () => {
	try {
		await DB_connect();
		console.log("Successfully connected to the database");

		app.listen(PORT, () => {
			console.log(`Server is listening on port ${PORT}`);
		});
	} catch (err) {
		console.log(`Failed to start the server: ${err}`);
		process.exit(1);
	}
})();
