module.exports = {
	EMAIL_SECRET: "ALJSAJFAFFASaAFLAFA",
	gmail: {
		gmailOptions: {
			service: "gmail",
			auth: {
				type: "OAuth2",
				user: "surveyllama@gmail.com", //process.env.MAIL_USERNAME,
				pass: "password@***", //process.env.MAIL_PASSWORD
				clientId: "*********.apps.googleusercontent.com", //process.env.OAUTH_CLIENTID,
				clientSecret: "GOCSPX-T-*********", //process.env.OAUTH_CLIENT_SECRET,
				refreshToken: "1//04xOc1UhSYDo-CgYIARAAGAQSNwF-L9IrAEzLoWWzc8oZx-*****************-lLhFo" //process.env.OAUTH_REFRESH_TOKEN
			}
		}
	},
	mailgun: {
		mailgunOptions: {
			service: "Mailgun",
			auth: {
				api_key: "*****-156db0f1-d8e333b0",
				domain: "surveyllama.ai" //'one of your domain names listed at your https://app.mailgun.com/app/sending/domains'
			}
		}
	}
};
