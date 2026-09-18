const { app } = require("@azure/functions");

app.timer("refresh-server", {
	schedule: "0 */15 * * * *",
	handler: async (myTimer, context) => {
		context.log("Pinging server");

		try {
			await fetch(process.env.PING_URL);
			context.log("Success");
		} catch (error) {
			context.error(`Failed: ${error}`);
		}
	},
});
