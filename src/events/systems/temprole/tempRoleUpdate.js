const { checkExpiredRoles } = require("../../../utils");

module.exports = {
    name: "tempRoleUpdate",
    execute(client) {
      checkExpiredRoles(client);
    }
};
