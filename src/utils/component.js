class Component {
    constructor({ customId, componentType, run }) {
        this.customId = customId;
        this.componentType = componentType;
        this.run = run;
    }

    async handleInteraction(interaction) {
        try {
            await this.run(interaction);
        } catch (error) {
            console.error("Error handling interaction:", error);
        }
    }
}

module.exports = Component;