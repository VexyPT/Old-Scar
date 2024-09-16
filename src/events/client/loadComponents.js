const { handleInteraction } = require("../../utils/componentLoader.js");

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (
            interaction.isButton() ||
            interaction.isStringSelectMenu() ||
            interaction.isModalSubmit() ||
            interaction.isUserSelectMenu() ||
            interaction.isRoleSelectMenu()
        ) {
            handleInteraction(interaction);
        }
    }
};
