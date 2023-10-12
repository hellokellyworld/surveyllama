//npm install chalk
//then run this program with:
//  node test_chalk.js
//and you should see true wihh color and undefined with no color
//
const { logger } = require("../../loggers/logger.js");
const chalk = require("chalk");
const isTTY = process.stdout.isTTY;
logger.info("%s Hi there, this console is TTY?: %s", chalk.cyan("INFO"), chalk.green(isTTY));
