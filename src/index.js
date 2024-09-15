require("dotenv").config({ path: process.env.NODE_ENV === "development" ? ".env.development" : ".env" });
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const handler = require("./handler/index");
const mongoose = require("mongoose");

const client = new Client({
  intents: [
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.settings = require("./resources/configs/settings.json");

handler(client);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    client.login(process.env.TOKEN); // login
  })
  .catch(err => console.error("Failed to connect to MongoDB", err));

module.exports = { client };

process.on("unhandledRejection", (reason, p) => {
  console.log("[antiCrash] :: Unhandled Rejection/Catch" + reason);
  console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
  console.log("[antiCrash] :: Uncaught Exception/Catch" + err.message);
  console.log(err, origin);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log("[antiCrash] :: Uncaught Exception/Catch (MONITOR)" + err.message);
  console.log(err, origin);
});