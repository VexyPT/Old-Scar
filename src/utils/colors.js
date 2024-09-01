const fs = require("fs");
const settings = JSON.parse(fs.readFileSync("src/resources/configs/settings.json", "utf8"));
const colors = settings.colors;

function getColor(name) {
  try {
    if (colors[name]) {
      // Converte a cor hexadecimal para um inteiro RGB
      return parseInt(colors[name].replace("#", ""), 16);
    } else {
      // Se a cor não estiver definida, assume que "name" já é uma cor hexadecimal sem o "#"
      return parseInt(name.replace("#", ""), 16);
    }
  } catch (error) {
    console.error(`Erro ao obter cor "${name}":`, error);
    return 0x000000;
  }
}

const color = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === "string") {
      return getColor(prop);
    }
    return undefined;
  }
});

module.exports = { color };
