const { checkExpiredRoles } = require("../utils");

module.exports = {
    name: "tempRoleUpdate",
    execute(client) {
        //console.log("Handling new temp role data...");

        checkExpiredRoles(client);
    }
};
