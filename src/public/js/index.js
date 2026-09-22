/* 
Globals:
accepted_games - from the backend. list of all games. used to filter the list
*/
let $ = (selector) => document.querySelector(selector);

const GameItem = (game) => `
<tr>
  <td>${game.name ?? ""}</td>
  <td>${game.stability ?? ""}</td>
  <td>${game.pr_status?.replace("--", "N/A") ?? ""}</td>
  <td>${game.rating ?? ""}</td>
  <td>${game.platforms?.join(", ") ?? ""}</td>
  <td>
	${game.links?.map((link, index) => `<a href=${link.uri ?? ""} target="_blank">${link.text ?? ""}</a>${index !== game.links.length - 1 ? ", " : ""}`).join("") ?? ""}
  </td>
  <td>
	${game.setup?.map((link, index) => `<a href=${link.uri ?? ""} target="_blank">${link.text ?? ""}</a>${index !== game.links.length - 1 ? ", " : ""}`).join("") ?? ""}
  </td>
  <td>
	${game.support?.map((link, index) => `<a href=${link.uri ?? ""} target="_blank">${link.text ?? ""}</a>${index !== game.links.length - 1 ? ", " : ""}`).join("") ?? ""}
  </td>
  <td>${game.disclosure ?? ""}</td>
</tr>
`;

function filterGames() {
	$("#games-list-body").replaceChildren();
	let games = structuredClone(accepted_games);

	const stability = $("#stability-select").value;
	if (stability !== "Unselected") {
		games = games.filter((game) => game.stability === stability);
	}

	const pr_status = $("#pr-status-select").value;
	if (pr_status !== "Unselected") {
		games = games.filter((game) => game.pr_status === pr_status);
	}

	const rating = $("#rating-select").value;
	if (rating !== "Unselected") {
		games = games.filter((game) => game.rating === (rating === "18" ? "TRUE" : "FALSE"));
	}

	const disclosure = $("#disclosure-select").value;
	if (disclosure !== "Unselected") {
		games = games.filter((game) => game.disclosure === disclosure);
	}

	const platform = $("#platform-select").value;
	if (platform !== "Unselected") {
		games = games.filter((game) => (platform !== "None" ? game.platforms?.includes(platform) : !game.platforms || game.platforms?.length === 0));
	}

	games.forEach((game) => {
		$("#games-list-body").insertAdjacentHTML("beforeend", GameItem(game));
	});
}
$("#filters").addEventListener("change", filterGames);

function normalize(game) {
	return game
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function areGamesSame(game1, game2) {
	const a = normalize(game1);
	const b = normalize(game2);
	if (a === b) return true;

	// Fuzzy searching:
	const short = a.length < b.length ? a : b;
	const long = a.length < b.length ? b : a;

	return long.includes(short);
}

function searchGames() {
	$("#games-list-body").replaceChildren();
	const query = $("#game-search-input").value;
	console.log(`Searching: ${query}`);
	let games = structuredClone(accepted_games);

	games = games.filter((game) => areGamesSame(game.name, query));

	games.forEach((game) => {
		$("#games-list-body").insertAdjacentHTML("beforeend", GameItem(game));
	});
}
$("#game-search-input").addEventListener("keyup", searchGames);
