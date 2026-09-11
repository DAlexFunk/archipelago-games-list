import express from "express";
import path from "node:path";
const app = express();
const PORT = process.env.PORT || 8080;

app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "ejs");

app.use("/", (req, res) => {
    res.render("index");
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
