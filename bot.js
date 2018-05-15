//skill module
var botBuilder = require('claudia-bot-builder'),
  AWS = require('aws-sdk'),
  dynamoDb = new AWS.DynamoDB.DocumentClient();

const getIntentName = function (alexaPayload) {
      'use strict';
      return alexaPayload &&
        alexaPayload.request &&
        alexaPayload.request.type === 'IntentRequest' &&
        alexaPayload.request.intent &&
        alexaPayload.request.intent.name;
  },
  checkDialogFinished = function (alexaPayload) {
      'use strict';
      return alexaPayload &&
        alexaPayload.request &&
        alexaPayload.request.type === 'IntentRequest' &&
        alexaPayload.request.dialogState === 'COMPLETED';
  },
  extractSlotValue = function(alexaPayload, slotName) {
    'use strict';
    let resolutions = alexaPayload.request.intent.slots[slotName].resolutions.resolutionsPerAuthority;
    for (let value of resolutions) {
      if(value.status.code = 'ER_SUCCESS_MATCH') {
        return value.values[0].value.name;
      }
    }
    return extractNonERValue(alexaPayload, slotName);
  },
  extractNonERValue = function(alexaPayload, slotName) {
    'use strict';
    return alexaPayload.request.intent.slots[slotName].value;
  },
  DialogDelegate = {
    type: 'Dialog.Delegate'
  };

const api = botBuilder(
  function (message, originalRequest) {
    'use strict';
    console.log(originalRequest.body);
    var user = originalRequest.body.session.user.userId;
    // message.text has all intent placeholders joined together, for quick access
    if (originalRequest.body.request.type === 'LaunchRequest') {
       // just return a text message to have it automatically packaged
       // as a PlainText Alexa response, continuing the session
       return "The pleasure is mine. What can I do for you? Feel free to ask for help if you need it.";
    // you can use all the Alexa request properties from originalRequest.body
    } else if (getIntentName(originalRequest.body) === 'CreateTask') {
      if(checkDialogFinished(originalRequest.body)) {
        console.log("Dialog is done");
        console.log(extractSlotValue(originalRequest.body, "Ability"))
        console.log(extractSlotValue(originalRequest.body, "Description"))
        console.log(extractSlotValue(originalRequest.body, "TargetDate"))
        console.log(extractSlotValue(originalRequest.body, "Difficulty"))
        return "Great! I'll keep a tab on your " + extractSlotValue(originalRequest.body, "Ability") + " quest.";
      } else {
        return {
          directives: [DialogDelegate]
        }
      }
    } else if (getIntentName(originalRequest.body) === 'GetTaskInfo') {
    } else if (getIntentName(originalRequest.body) === 'CompleteTask') {
    } else if (getIntentName(originalRequest.body) === 'GetOpenTasks') {
    } else if (getIntentName(originalRequest.body) === 'CheckStats') {
    } else if (getIntentName(originalRequest.body) === 'GetLevel') {
    } else if (getIntentName(originalRequest.body) === 'Challenge') {
    } else if (getIntentName(originalRequest.body) === 'DeleteTask') {
    } else if (getIntentName(originalRequest.body) === 'Settings'){
    } else if (getIntentName(originalRequest.body) === 'AMAZON.HelpIntent'){
    } else if (getIntentName(originalRequest.body) === 'AMAZON.StopIntent'){
      // return a JavaScript object to set advanced response params
      // this prevents any packaging from bot builder and is just
      // returned to Alexa as you specify
      return {
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'See you around!'
          },
          shouldEndSession: true
        }
      };
    } else {
      return {};
    }
  },
  { platforms: ['alexa'] }
);

module.exports = api;