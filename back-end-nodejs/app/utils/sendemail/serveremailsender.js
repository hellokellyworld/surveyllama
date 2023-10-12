const nodemailer = require("nodemailer");
const { logger } = require("../../loggers/logger");
const mg = require("nodemailer-mailgun-transport");
const { mailgun } = require("./mailcrendentials.js");
const { gmail } = require("./mailcrendentials.js");
const mailgunOptions = mailgun.mailgunOptions;
const gmailOptions = gmail.gmailOptions;
const mailService = require("./mailredirect.config.js")();

var mailgunClient = nodemailer.createTransport(mg(mailgunOptions));
var gmailClient = nodemailer.createTransport(gmailOptions);

module.exports = function () {
	return mailService === "Mailgun" ? emailSenderMailgun() : emailSenderGmail();
};

function emailSenderGmail() {
	const from = '"SurveyLlama Admin" <surveyllama@gmail.com>';
	const errorRecipient = "surveyllama@gmail.com";

	return {
		send: function (fromEmail, toEmail, replyTo, name, textBody, html, subject, attachments) {
			const from = name && fromEmail ? `${name} <${fromEmail}>` : `${name || fromEmail}`;
			return gmailClient.sendMail({
				from,
				to: toEmail,
				replyTo: replyTo,
				name: name,
				textBody: textBody || null,
				html: html,
				subject: subject,
				generateTextFromHtml: textBody ? false : true,
				attachments: attachments ? attachments : null
			});
		},
		emailError: function (message, filename, exception) {
			const body = "<h1>SurveyLLama Site Error</h1>" + "message:<br><pre>" + message + "</pre><br>";
			if (exception) body += "exception:<br><pre>" + exception + "</pre><br>";
			if (filename) body += "filename:<br><pre>" + filename + "</pre><br>";

			return gmailClient.sendMail({
				//return a Promise
				from: from,
				to: errorRecipient,
				subject: "SurveyLLama Site Error",
				html: body,
				generateTextFromHtml: true
			});
		}
	};
}

function emailSenderMailgun() {
	const from = '"SurveyLLama Admin" <surveyllama@surveyllama.ai>';
	const errorRecipient = "surveyllama@gmail.com";

	return {
		send: function (fromEmail, toEmail, replyTo, name, textBody, html, subject, attachments) {
			const from = name && fromEmail ? `${name} <${fromEmail}>` : `${name || fromEmail}`;
			return mailgunClient.sendMail({
				from,
				to: toEmail,
				replyTo: replyTo,
				name: name,
				textBody: textBody || null,
				html: html,
				subject: subject,
				generateTextFromHtml: textBody ? false : true,
				attachments: attachments ? attachments : null
			});
		},
		emailError: function (message, filename, exception) {
			const body = "<h1>SurveyLLama Site Error</h1>" + "message:<br><pre>" + message + "</pre><br>";
			if (exception) body += "exception:<br><pre>" + exception + "</pre><br>";
			if (filename) body += "filename:<br><pre>" + filename + "</pre><br>";

			return mailgunClient.sendMail({
				//return a Promise
				from: from,
				to: errorRecipient,
				subject: "SurveyLLama Site Error",
				html: body,
				generateTextFromHtml: true
			});
		}
	};
}
