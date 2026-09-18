const { app } = require("@azure/functions");

app.timer("refresh-games-list", {
	schedule: "0 0 0 * * *",
	handler: async (myTimer, context) => {
		context.log("Pinging server");

		try {
			await pingServer(process.env.PING_URL);
			context.log("Success");
		} catch (error) {
			context.error(`Failed: ${error}`);
		}
	},
});
