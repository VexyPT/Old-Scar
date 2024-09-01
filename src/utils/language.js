const fs = require("fs");
const path = require("path");

const languages = {};
const loadLanguage = (lang) => {
  if (!languages[lang]) {
    try {
      const data = fs.readFileSync(path.resolve(__dirname, `../languages/${lang}.json`), "utf8");
      languages[lang] = JSON.parse(data);
    } catch (error) {
      console.error(`Error loading language file: ${error.message}`);
      return null;
    }
  }
  return languages[lang];
};

const t = (key, { locale, replacements = {} }) => {
  const language = loadLanguage(locale);

  if (!language) {
    return key;
  }

  let translated = key.split(".").reduce((obj, i) => (obj ? obj[i] : null), language) || key;

  for (const [searchValue, replaceValue] of Object.entries(replacements)) {
    translated = translated.replace(new RegExp(`{{${searchValue}}}`, "g"), replaceValue);
  }

  return translated;
};

module.exports = { t };
