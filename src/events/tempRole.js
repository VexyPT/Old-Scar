const { scheduleNextCheck } = require("../utils");

module.exports = {
    name: "ready",
    customName: "tempRole Verification",
    once: true,
    async execute(client) {

        console.log("TempRoles synchronized");

        scheduleNextCheck(client);
    }
};
