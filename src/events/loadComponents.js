const { handleInteraction } = require("../utils/componentLoader"); 

module.exports = {
    name: "interactionCreate",
    customName: "LoadComponents",
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
        handleInteraction(interaction);
    }
};