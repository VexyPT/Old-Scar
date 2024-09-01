const fs = require("fs");
const { formatEmoji } = require("discord.js");
const settings = JSON.parse(fs.readFileSync("src/resources/configs/settings.json", "utf8"));
const emojis = settings.emojis;

function emoji(name) {
  try {
    const [category, ...rest] = name.split('_');
    const emojiName = rest.join('_');
    if (category === 'static' && emojis.static[emojiName]) {
      return formatEmoji(emojis.static[emojiName]);
    } else if (category === 'animated' && emojis.animated[emojiName]) {
      return formatEmoji(emojis.animated[emojiName], true);
    } else if (category === 'default' && emojis.default[emojiName]) {
      return emojis.default[emojiName];
    } else if (emojis.static[name]) {
      return formatEmoji(emojis.static[name]);
    } else if (emojis.animated[name]) {
      return formatEmoji(emojis.animated[name], true);
    } else if (emojis.default[name]) {
      return emojis.default[name];
    } else {
      return `:${name}:`;
    }
  } catch (error) {
    console.error(`Erro ao obter emoji "${name}":`, error);
    return `:x:`;
  }
}

function emojiId(name) {
  try {
    const [category, ...rest] = name.split('_');
    const emojiName = rest.join('_');
    if (category === 'static' && emojis.static[emojiName]) {
      return emojis.static[emojiName];
    } else if (category === 'animated' && emojis.animated[emojiName]) {
      return emojis.animated[emojiName];
    } else if (category === 'default' && emojis.default[emojiName]) {
      return emojis.default[emojiName];
    } else if (emojis.static[name]) {
      return emojis.static[name];
    } else if (emojis.animated[name]) {
      return emojis.animated[name];
    } else if (emojis.default[name]) {
      return emojis.default[name];
    } else {
      return `:${name}:`;
    }
  } catch (error) {
    console.error(`Erro ao obter ID do emoji "${name}":`, error);
    return `:x:`;
  }
}

const e = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === "string") {
      return emoji(prop);
    }
    return undefined;
  }
});

const eId = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === "string") {
      return emojiId(prop);
    }
    return undefined;
  }
});

module.exports = { e, eId };

/*
// Usage examples:
console.log(e.static_check); // Static emoji for 'check'
console.log(e.animated_check); // Animated emoji for 'check'
console.log(e.default_check); // Default emoji for 'check'
console.log(e.check); // Default behavior (prioritizes static > animated > default)

console.log(eId.static_check); // Static emoji ID for 'check'
console.log(eId.animated_check); // Animated emoji ID for 'check'
console.log(eId.default_check); // Default emoji ID for 'check'
console.log(eId.check); // Default behavior (prioritizes static > animated > default)
*/