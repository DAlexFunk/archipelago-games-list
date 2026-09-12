import express from "express";
import path from "node:path";
import { SHEETS_DATA_VALUES, getSheetData } from "./models.js";
const app = express();
const PORT = process.env.PORT || 8080;

app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "ejs");

app.use("/", async (req, res) => {
	const sheet_data = await getSheetData();
	res.render("index", { games: sheet_data, GAMES_ENUM: SHEETS_DATA_VALUES });
});

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
