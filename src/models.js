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

async function getSheetData() {
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

export { SHEETS_DATA_VALUES, getSheetData };
