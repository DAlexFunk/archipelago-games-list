const SHEETS_DATA_VALUES = Object.freeze({
	NAME: 0,
	STABILITY: 1,
	PR_STATUS: 2,
	RATING: 3,
	LINKS: 4,
	SETUP: 5,
	SUPPORT: 6,
	DISCLOSURES: 7,
	COMMENTS: 8,
});

/**
 * Fetches the sheet data from the spreadsheet
 * @returns {bool | Object[]} False if the data could not be found, the data otherwise
 */
module.exports = async function SHEETS_getSheetData(context) {
	const SHEET_ID = "1iuzDTOAvdoNe8Ne8i461qGNucg5OuEoF-Ikqs8aUQZw";
	const SHEET_RANGE = "'Playable Worlds'!A:I";
	const SHEET_FIELDS = "sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link(uri)))))))";

	const raw_sheet_res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${process.env.SHEETS_KEY}&ranges=${SHEET_RANGE}&fields=${SHEET_FIELDS}`);

	const contentType = raw_sheet_res.headers.get("content-type");
	if (!raw_sheet_res.ok || !contentType || !contentType.includes("application/json")) {
		context.log("Invalid response");
		return false;
	}

	const raw_data = await raw_sheet_res.json();

	// Get the part we need (we do not need the first 2 rows)
	let sheet_data = raw_data?.sheets?.[0]?.data?.[0]?.rowData;

	if (!Array.isArray(sheet_data)) {
		context.log(`Not data: ${sheet_data}`);
		return false;
	}

	sheet_data = sheet_data.slice(2);

	// Filter null rows
	sheet_data = sheet_data.filter((row) => Object.keys(row.values[SHEETS_DATA_VALUES.NAME]).length !== 0);

	return sheet_data.map((game) => ({
		name: game.values[SHEETS_DATA_VALUES.NAME].formattedValue,
		stability: game.values[SHEETS_DATA_VALUES.STABILITY].formattedValue,
		pr_status: game.values[SHEETS_DATA_VALUES.PR_STATUS].formattedValue,
		rating: game.values[SHEETS_DATA_VALUES.RATING].formattedValue,
		disclosure: game.values[SHEETS_DATA_VALUES.DISCLOSURES].formattedValue,
		links: formatLinks(game.values[SHEETS_DATA_VALUES.LINKS]),
		setup: formatLinks(game.values[SHEETS_DATA_VALUES.SETUP]),
		support: formatLinks(game.values[SHEETS_DATA_VALUES.SUPPORT]),
		comments: formatComments(game.values[SHEETS_DATA_VALUES.COMMENTS]),
	}));
};

function formatComments(comments_obj) {
	if (!comments_obj) return {};

	const retVal = {};
	retVal.text = comments_obj.formattedValue;

	retVal.urls = [];
	if (comments_obj.hyperlink) {
		retVal.urls.push(comments_obj.hyperlink);
	} else if (comments_obj.textFormatRuns) {
		comments_obj.textFormatRuns.forEach((link) => {
			if (link.format.link) {
				retVal.urls.push(link.format.link.uri);
			}
		});
	}

	return retVal;
}

function formatLinks(links_obj) {
	const links_text = links_obj.formattedValue?.split(", ");
	if (!links_text) return [];

	let retval = [];
	if (links_text.length === 1) {
		retval.push({ text: links_obj.formattedValue, uri: links_obj.hyperlink });
	} else {
		let links_found = 0;
		links_obj.textFormatRuns.forEach((link) => {
			if (link.format.link) {
				retval.push({ text: links_text[links_found], uri: link.format.link.uri });
				links_found++;
			}
		});
	}

	return retval;
}
