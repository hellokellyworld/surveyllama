// const { OpenAI } = require("langchain/llms/openai");
const { ChatOpenAI } = require("langchain/chat_models/openai");
// const { initializeAgentExecutor } = require("langchain/agents");
const { BufferMemory } = require("langchain/memory");
const { ErrorClass } = require("../helpers/error");
const { httpStatusCodes } = require("../constants");
const { OPENAI_API_KEY } = require("../../config/prompttoai.config.js");
const {
	//  ConversationChain,
	LLMChain
} = require("langchain/chains");
const {
	ChatPromptTemplate,
	// HumanMessagePromptTemplate,
	SystemMessagePromptTemplate
	// MessagesPlaceholder,
	// PromptTemplate,
} = require("langchain/prompts");
const jwt = require("jsonwebtoken");
const { jsonwebtokenkeys } = require("../../config/jsonwebtokenkeys");
const encodeSecret = jsonwebtokenkeys.JWT_API_KEY;
const ChatData = require("../models/chatData.model.js");
const _debug = require("debug");
const { logger } = require("../loggers/logger");
const SurveySession = require("../models/surveySession.model.js");

exports.talktoai = async (req, res, next) => {
	if (req.body) {
		const AISettingToken = jwt.verify(req.body.AISettingToken, encodeSecret, {
			ignoreExpiration: false
		}).id;
		const goal = AISettingToken.goal;
		const role = AISettingToken.role;
		const surveyId = req.body.surveyId;
		const chatHistory = req.body.history;
		const humanText = req.body.question;
		let chatHistoryObjArray = [
			{
				textInput: humanText,
				isRobot: false,
				timestamp: Date.now()
			}
		];

		//Tom Long comments:

		//Still a lot of optimization needed on the prompts, also need to
		//use memory/thought method (agent) to have it more intelligent.

		//Agent： chain (LLM) +tools (read files， calculate Math, search for info )
		//      AI tool （tool to check customer mood, tool to check if customer is diagressing
		//      tool to do summary, tools that you have to involve an LLM conservation to get answer).

		//goal may need to consider data including product pictures. If we do get pictures
		//from user, what do we do with it.

		//Will need to have prompt for first greeting,
		//prompt for pitch (giving incentive) to user
		//prompt for detecting surveyee (human)'s mood (happy, confused, anxious, angry）
		const sentimentDetectionPrompt = ChatPromptTemplate.fromPromptMessages([
			SystemMessagePromptTemplate.fromTemplate(
				"Sentiment analysis of human from the following chat_history: {humanMessageHistory}. Your analysis result should either be positive or negative." +
					"Desired format: Sentiment:<positive or negative>"
			)
		]);
		const sentimentDetectionChain = new LLMChain({
			prompt: sentimentDetectionPrompt,
			llm: new ChatOpenAI({
				temperature: 0,
				openAIApiKey: OPENAI_API_KEY
			})
		});

		let humanMessageHistory = [];
		if (chatHistory) {
			chatHistory.map((chat) => {
				const humanMessage = chat[0];
				humanMessageHistory.push(humanMessage);
			});
		}
		humanMessageHistory.push(humanText); //push the latest human message

		const sentimentDetectionResult = await sentimentDetectionChain.call({
			humanMessageHistory: humanMessageHistory || []
		});

		const offTopicCount = req.body.offTopicCount;
		const conversationTopic = role + " - " + goal;
		const offTopicDetectionPrompt = ChatPromptTemplate.fromPromptMessages([
			SystemMessagePromptTemplate.fromTemplate(
				"Check if the {conversation} has deviated from the {topic}" + "Desired format: Off_Topic_Check:<Yes or No>"
			)
		]);
		const offTopicDetectionChain = new LLMChain({
			prompt: offTopicDetectionPrompt,
			llm: new ChatOpenAI({
				temperature: 0,
				openAIApiKey: OPENAI_API_KEY
			})
		});

		const offTopicDetectionResult = await offTopicDetectionChain.call({
			conversation: humanMessageHistory,
			topic: conversationTopic
		});
		const updatedOffTopicCount = offTopicCount + (offTopicDetectionResult.includes("Yes") ? 1 : 0);

		//prompt for checking whether suggested response is smooth and aligned with the user's mood
		//prompt for checking whether user is counter-asking questions/diagress (check the types of sentence: imperative, declarative, interrogative, exclaimative)
		//prompt for self-thinking on whether goal is achieved,
		//prompt for closing conversation if goal achived or if we have to abandon the surveychat

		//Besides goal, we need a setup of the conversation (a scenario of who the surveyee is and who the surveyee might be), so that
		//AI can decide better how to do opening greetings and pitching with the surveyee.
		//Such as: Suppose you are a marketing manager and you are meeting with someone who is potentially buying
		//that you can help. And your goal is {goal}, you will need to finish an survey conversation with him/her
		//to achieve your goal.

		//Ad Placement Tag
		//Id for each user/conversation

		//store data of the conversation in the mongodb to
		//1) have data of products
		//2) have conversation history so that the same user can continue from last time
		//  (maybe user can opt-out, to ask AI not to remember anything after this session)
		//here we may need to use OpenAI function calls with schema (see Jason Liu examples with notes-and-thoughts/functional call

		//use caching to save money on LLM calls (see notes-and-thoughts/2023-06-25-chatting-to-save-money
		//find a landing senario that actually works out (Ins,LinkedIn)

		//implement payment (calling paypal/venmo/stripe/credit card)

		const chatPrompt = ChatPromptTemplate.fromPromptMessages([
			SystemMessagePromptTemplate.fromTemplate(
				"Given the {chat_history}, you play the role of {role}, and your overall goal is to {goal}. Now the human says {text}," +
					"suggest a response to the human to achieve your goal." +
					"Once your goal has been achieved, extract the important information from the {chat_history} in JSON format." +
					"Desired format: Response:<your response> Data:<JSON data you summarized>"
			)
		]);
		const ChatChain = new LLMChain({
			prompt: chatPrompt,
			llm: new ChatOpenAI({
				temperature: 0,
				openAIApiKey: OPENAI_API_KEY
			})
		});

		try {
			const result = await ChatChain.call({
				role: role, //market researcher
				goal: goal, // looking for specifics of the market
				text: humanText,
				chat_history: chatHistory || []
			});
			let response_position = result.text.indexOf("Response:");
			let data_position = result.text.indexOf("Data:");
			const response = result.text.substring(
				response_position + 10,
				data_position != -1 ? data_position : result.text.length - 1
			);
			// save chat data into database
			const chatDataForm = JSON.parse(result.text.substring(data_position + 6));
			try {
				createChatData(chatDataForm);
			} catch (error) {
				logger.warn("prompttoai.js: create chat data response error", err);
			}

			//update survey in database
			chatHistoryObjArray.push({
				textInput: response,
				isRobot: true,
				timestamp: Date.now()
			});
			const updatedSurveyData = {
				offTopicCount: updatedOffTopicCount,
				chatHistory: chatHistoryObjArray,
				surveyId: surveyId,
				chatData: chatDataForm
			};

			const updatedSurveySession = await updateSurveySession(updatedSurveyData);

			//return result to front-end
			return res.status(httpStatusCodes.httpCode200.code).json({
				success: true,
				message: "prompttoai.js: successfully get AI response " + httpStatusCodes.httpCode200.message,
				result: {
					output: JSON.stringify({
						data: response,
						offTopicCount: updatedOffTopicCount
					})
				},
				error: null,
				statusCode: httpStatusCodes.httpCode200.code
			});
		} catch (err) {
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode500.code,
					false,
					"prompttoai.js: failed to get AI response " + httpStatusCodes.httpCode400.message
				)
			);
		}
	} else {
		logger.warn("prompttoai.js: bad request query, body does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"prompttoai.js: bad request query, body does not exist, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.getGreetingFromTaskToken = async function (req, res, next) {
	if (req.query) {
		const memory = new BufferMemory({
			returnMessages: true,
			memoryKey: "chat_history",
			inputKey: "input"
		});
		const AISettingToken = jwt.verify(req.query.token, encodeSecret, {
			ignoreExpiration: false
		}).id;
		const goal = AISettingToken.goal;
		const role = AISettingToken.role;
		const chatPrompt = ChatPromptTemplate.fromPromptMessages([
			SystemMessagePromptTemplate.fromTemplate(
				"You are a {role}, and Your overall goal is to {goal}. First, say a greeting phrase like how are you. Second, say a question to start the conversation with a human. Give your first question in one sentence."
			)
		]);
		const ChatChain = new LLMChain({
			prompt: chatPrompt,
			llm: new ChatOpenAI({
				temperature: 0,
				openAIApiKey: OPENAI_API_KEY
			})
		});

		try {
			const result = await ChatChain.call({
				goal: goal,
				role: role
			});
			return res.status(httpStatusCodes.httpCode200.code).json({
				success: true,
				message:
					"prompttoai.js:getGreetingFromTaskToken: successfully get AI's greeting " +
					httpStatusCodes.httpCode200.message,
				result: {
					output: JSON.stringify({ data: result.text })
				},
				error: null,
				statusCode: httpStatusCodes.httpCode200.code
			});
		} catch (err) {
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode500.code,
					false,
					"prompttoai.js:getGreetingFromTaskToken: failed to get AI's greeting " + httpStatusCodes.httpCode400.message
				)
			);
		}
	} else {
		logger.warn("prompttoai.js:getGreetingFromTaskToken: bad request query, body does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"prompttoai.js: bad request query, body does not exist, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

async function generateRoleGoalUrl(data) {
	const infoTobeEncoded = { goal: data.goal, role: data.role };

	return new Promise((resolve, reject) => {
		jwt.sign(
			{
				id: infoTobeEncoded
			},
			encodeSecret,
			function (err, result) {
				if (err) {
					logger.error("prompttoai.js:generateGoalToken: fail sign goal data token", err);
					reject(err);
				}
				// const url = "http://localhost:8080/chatwindow";
				const url = "/chatwindow";
				const concatenatedUrl = url + "?token=" + result;
				console.log("prompttoai.js:generateGoalToken: cancated url is: ", concatenatedUrl);
				resolve(concatenatedUrl);
			}
		);
	});
}

function createChatData(data) {
	const debug = _debug("sl:prompttoai.controller.js:createChatData");
	debug("creating chat data...");
	if (data) {
		const form = {
			products: data.products,
			prices: data.prices,
			//priceUnit: "",
			location: data.location,
			createdAt: Date.now()
		};
		const cd = new ChatData(form);
		return new Promise((resolve, reject) => {
			cd.save()
				.then((cd) => {
					if (!cd._id) {
						logger.error("createChatData: failure creating chat data in DB.");
						throw new Error("Failure creating chat data in DB");
					}
					resolve(cd);
				})
				.catch((error) => {
					logger.error("createChatData: failure creating chat data in DB.");
					logger.error(error);
					reject(error); //here reject will basically return error so that the caller can catch it
				});
		});
	} else {
		logger.warn("prompttoai.js:createChatData: chat data is null");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"prompttoai.js:createChatData:chat data is null " + httpStatusCodes.httpCode400.message
			)
		);
	}
}
function updateChatData(updatedData) {
	const debug = _debug("sl:prompttoai.js:updateChatData");
	debug("updating chat data...");
}
function grabChatData(args) {
	const debug = _debug("sl:prompttoai.js:grabChatData");
	debug("grabing chat data...");
}
function removeChatData(args) {
	const debug = _debug("sl:prompttoai.js:removeChatData");
	debug("removing chat data...");
}

exports.createCampaign = async function (req, res, next) {
	if (req.body) {
		await generateRoleGoalUrl(req.body)
			.then((url) => {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "campaign created " + httpStatusCodes.httpCode200.message,
					result: {
						linkToConversation: url
					},
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((error) => {
				logger.warn("prompttoai.js:createCampaign:failure generating goal-role token, aborted.");
				logger.warn(error);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"prompttoai.js:createCampaign: failure generating goal-role token, aborted. " +
							httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.warn("prompttoai.js:createCampaign:bad request query, body does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"prompttoai.js:createCampaign: bad request query, body does not exist, aborted. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.createSurveySession = async function (req, res, next) {
	const debug = _debug("sl:prompttoai.controller.js:createSurveySession");
	debug("creating a new chat ...");
	if (req.body) {
		const form = {
			AISettingToken: req.body.AISettingToken,
			offTopicCount: 0,
			isGoalAchieved: false,
			// chatData: {
			//   products: "",
			//   prices: "",
			//   location: "",
			//   createdAt: Date.now(),
			// },
			chatHistory: [],
			createdAt: Date.now()
		};
		let survey_id;
		const surveySession = new SurveySession(form);

		surveySession
			.save()
			.then((s) => {
				if (!s._id) {
					logger.error("createSurveySession: failure creating survey chat in DB.");
					throw new Error("failure creating survey chat in DB");
				}
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message:
						"prompttoai.js:createSurveySession: successfully creating chat in DB " +
						httpStatusCodes.httpCode200.message,
					result: {
						id: s._id
					},
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((error) => {
				logger.error("createSurveySession: failure creating survey chat in DB.");
				logger.error(error);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"createSurveySession: failed creating survey chat." + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.warn("prompttoai.controller.js:createSurveySession: survey chat initialization information is null");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"prompttoai.controller.js:createSurveySession: survey chat initialization information is null " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

function updateSurveySession(data) {
	const debug = _debug("sl:prompttoai.controller.js:updateSurveySession");
	debug("update a chat ...");
	return new Promise((resolve, reject) => {
		if (data.surveyId) {
			SurveySession.findById(data.surveyId)
				.then((survey) => {
					let updatedChatHistory = survey.chatHistory;
					data.chatHistory.forEach((chatHistoryObj) => {
						updatedChatHistory.push(chatHistoryObj);
					});
					const filter = { _id: data.surveyId };
					const dataToUpdate = {
						offTopicCount: data.offTopicCount,
						chatData: data.chatData,
						chatHistory: updatedChatHistory
					};
					SurveySession.findOneAndUpdate(filter, dataToUpdate, { new: true })
						.then((updatedSurvey) => resolve(updatedSurvey))
						.catch((err) => {
							logger.error("updateSurveySession: fail finding or updating survey chat.");
							logger.error(err);
							throw err;
						});
				})
				.catch((err) => {
					logger.error("updateSurveySession: fail finding survey chat given the id");
					logger.error(err);
					reject(err);
				});
		} else {
			reject(new Error("updateSurveySession:  missing survey id"));
		}
	});
}
