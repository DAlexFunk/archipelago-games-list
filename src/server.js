import express from "express";
import path from "node:path";
import { DB_connect, DB_getAllGames, DB_getUserSteamGames } from "./models/db.js";
const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));
app.use(express.static(path.join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res) => {
	res.json({ message: "works" });
});

app.use("/", async (req, res) => {
	let games = req.body?.steamid ? await DB_getUserSteamGames(req.body.steamid) : await DB_getAllGames();
	res.render("index", { games });
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
