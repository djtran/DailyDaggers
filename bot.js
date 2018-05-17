//skill module
var botBuilder = require('claudia-bot-builder'),
  AWS = require('aws-sdk'),
  dynamoDb = new AWS.DynamoDB.DocumentClient(),
  getIntentName = function (alexaPayload) {
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
  getSlot = function(alexaPayload, slotName) {
    'use strict';
    return alexaPayload.request.intent.slots[slotName];
  },
  extractNonERValue = function(alexaPayload, slotName) {
    'use strict';
    let slot = getSlot(alexaPayload, slotName);
    return slot.value;
  },
  extractSlotValue = function(alexaPayload, slotName) {
    'use strict';
    let slot = getSlot(alexaPayload, slotName);
    if (slot.resolutions){
      let resolutions = slot.resolutions.resolutionsPerAuthority;
      for (let value of resolutions) {
        if(value.status.code === 'ER_SUCCESS_MATCH') {
          return value.values[0].value.name;
        }
      }
    }
    return extractNonERValue(alexaPayload, slotName);
  };

const DialogDelegate = {
    response: {
      directives:[
        {
          type: 'Dialog.Delegate'
        }
      ],
      shouldEndSession: false
    }
  },
  dynamoDbTableName = 'DailyDaggers-test',
  dynamoParamsTemplate = {
    TableName: dynamoDbTableName
  },
  dynamoItemTemplate = function (newUserId) {
    return {
      Item: {
        userId: newUserId,
        settings: {
          styledTitle: true
        },
        stats: {
          level: 1,
          strength: 1,
          dexterity: 1,
          intelligence: 1,
          wisdom: 1,
          constitution: 1,
          charisma: 1,
          experience: 0
        },
        open: [],
        quests: []
      }
    }
  };

const api = botBuilder(
  function (message, originalRequest) {
    'use strict';
    console.log(message);
    console.log(originalRequest);
    var user = originalRequest.body.session.user.userId;

    // message.text has all intent placeholders joined together, for quick access
    if (originalRequest.body.request.type === 'LaunchRequest') {
       // just return a text message to have it automatically packaged
       // as a PlainText Alexa response, continuing the session
       return {
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: "The pleasure is mine. What can I do for you? Feel free to ask for help if you need it."
          },
          shouldEndSession: false
        }
      };
    // you can use all the Alexa request properties from originalRequest.body
    } else if (getIntentName(originalRequest.body) === 'CreateTask') {
      if (originalRequest.body.request.dialogState === 'STARTED'){
        return DialogDelegate;
      } else if (originalRequest.body.request.dialogState === 'IN_PROGRESS') {
        //Workaround for when all slots are filled but dialogState is 'IN_PROGRESS'
        //For some reason "for ... of" does not work here
        if(!extractNonERValue(originalRequest.body, 'Ability')) {
          return DialogDelegate;
        }
        if(!extractNonERValue(originalRequest.body, 'Description') || getSlot(originalRequest.body, 'Description').confirmationStatus === 'NONE') {
          return DialogDelegate;
        }
        if(!extractNonERValue(originalRequest.body, 'TargetDate')) {
          return DialogDelegate;
        }
        if(!extractNonERValue(originalRequest.body, 'Difficulty')) {
          return DialogDelegate;
        }
      }

      try {
        console.log("Create params.")
        //When we have something for everything...
        var params = Object.assign({}, dynamoParamsTemplate, { Key: { userId: user }});
        console.log("Dynamo Get for " + JSON.stringify(params))
        return dynamoDb.get(params).promise().then(function(data) {
          var itemExists = data.Item != null;
          console.log("Item exists? " + itemExists);
          //If no item, initialize a new one.
          if (!itemExists) {
            data = Object.assign({}, dynamoItemTemplate(user)); 
          }
          console.log(data);
          var questId = data.Item.quests.length;
          data.Item.quests.push({
              id: questId,
              styledTitle: "Verbing the Noun",
              description: extractNonERValue(originalRequest.body, "Description"),
              difficulty: extractSlotValue(originalRequest.body, "Difficulty"),
              stat: extractSlotValue(originalRequest.body, "Ability"),
              target: extractNonERValue(originalRequest.body, "TargetDate")
            });
          data.Item.open.push(questId);
          params = Object.assign({}, dynamoParamsTemplate, data);
          console.log("Dynamo Put for " +  + JSON.stringify(params)); 
          try {
            return dynamoDb.put(params).promise().then(function(data) {
              console.log("Successfully wrote to Dynamo Table : " + data);
              //Everything worked out fine!
              return "Great! I'll open a tab on your " + 
              extractSlotValue(originalRequest.body, "Ability") + 
              " quest.";
            }).catch(function(err){
                console.log("Could not write to DynamoDB : " + err)
                return "Sorry! Can't seem to find my pen. Write it down and come back in a bit.";
              }
            );
          } catch (error) {
            console.log(error);
            return "Sorry, I hit an error";
          }
        }).catch(function(err){
            console.log("Could not get from DynamoDB : " + err)
            return "Sorry! Can't seem to find my notebook. Write it down and come back in a bit."
          }
        );
      } catch (error) {
        console.log(error);
        return "Sorry, I hit an error";
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