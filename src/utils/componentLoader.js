const fs = require("fs");
const path = require("path");

const components = [];

function loadComponents(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            loadComponents(filePath);
        } else if (file.endsWith(".js")) {
            const component = require(filePath);
            components.push(component);
        }
    }
}

loadComponents(path.join(__dirname, "../components"));

function handleInteraction(interaction) {
    for (const component of components) {
        if (interaction.customId === component.customId && interaction.componentType === component.componentType) {
            component.handleInteraction(interaction);
            break;
        }
    }
}

module.exports = { handleInteraction, components };