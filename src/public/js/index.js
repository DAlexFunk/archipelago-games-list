/* 
Globals:
accepted_games - from the backend. list of all games. used to filter the list
GAMES_ENUM - from backend. enum to select the values from the games array
*/
let $ = (selector) => document.querySelector(selector);

const GameItem = (game) => `
<tr>
  <td>${game.values[GAMES_ENUM.NAME].formattedValue ?? ""}</td>
  <td>${game.values[GAMES_ENUM.STABILITY].formattedValue ?? ""}</td>
  <td>${game.values[GAMES_ENUM.PR_STATUS].formattedValue?.replace("--", "N/A") ?? ""}</td>
  <td>${game.values[GAMES_ENUM.RATING].formattedValue ?? ""}</td>
  <td><a href="${game.values[GAMES_ENUM.LINKS].hyperlink ?? "x"}">${game.values[GAMES_ENUM.LINKS].formattedValue ?? ""}</a></td>
  <td><a href="${game.values[GAMES_ENUM.SETUP].hyperlink ?? "x"}">${game.values[GAMES_ENUM.SETUP].formattedValue ?? ""}</a></td>
  <td><a href="${game.values[GAMES_ENUM.SUPPORT].hyperlink ?? "x"}">${game.values[GAMES_ENUM.SUPPORT].formattedValue ?? ""}</a></td>
  <td>${game.values[GAMES_ENUM.DISCLOSURES].formattedValue ?? ""}</td>
</tr>
`;

function filterGames() {
	$("#games-list").replaceChildren();
	let games = structuredClone(accepted_games);

	const stability = $("#stability-select").value;
	if (stability !== "Unselected") {
		games = games.filter((game) => game.values[GAMES_ENUM.STABILITY].formattedValue === stability);
	}

	const pr_status = $("#pr-status-select").value;
	if (pr_status !== "Unselected") {
		games = games.filter((game) => game.values[GAMES_ENUM.PR_STATUS].formattedValue === pr_status);
	}

	const rating = $("#rating-select").value;
	if (rating !== "Unselected") {
		games = games.filter((game) => game.values[GAMES_ENUM.RATING].formattedValue === (rating === "18" ? "TRUE" : "FALSE"));
	}

	const disclosure = $("#disclosure-select").value;
	if (disclosure !== "Unselected") {
		games = games.filter((game) => game.values[GAMES_ENUM.DISCLOSURES].formattedValue === disclosure);
	}

	games.forEach((game) => {
		$("#games-list").insertAdjacentHTML("beforeend", GameItem(game));
	});
}

$("#filters").addEventListener("change", filterGames);
