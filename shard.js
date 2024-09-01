const { ShardingManager } = require("discord.js");
require("dotenv").config({ path: process.env.NODE_ENV === "development" ? ".env.development" : ".env" });

if (process.env.NODE_ENV !== "development") {
  const manager = new ShardingManager("./src/index.js", {
    token: process.env.TOKEN
  });

  manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));
  manager.spawn().catch(error => console.log(`[ERROR/SHARD] Shard failed to spawn.\n` + error));;
} else {
  require("./src/index.js");
}