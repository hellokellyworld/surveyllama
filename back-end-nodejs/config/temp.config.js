const path = require("path");
const splitedPath = __dirname.split(path.sep);
const userTempFolderPath = splitedPath.splice(0, splitedPath.length - 1).join("/");

module.exports = { userTempFolderPath };
