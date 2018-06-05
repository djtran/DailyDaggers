//skill module
const botBuilder = require('claudia-bot-builder'),
AWS = require('aws-sdk'),
generator = require('fantasy-names'),
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
},
generateTitle = function(Ability, Difficulty) {
  //Groups and Individuals here: https://github.com/mattconsto/fantasy-names/blob/master/generator.js
  const dexPrefixes = ["Train", "Master", "Practice"],
    strPrefixes = ["Raid", "Storm", "Demolish", "Destroy", "Take Over", "Repel"],
    intPrefixes = ["Understand", "Research", "Discover", "Study"],
    conPrefixes = ["Resist", "Withstand", "Overcome", "Bolster"], //iffy
    wisPrefixes = ["Reconcile with", "Mediate for", "Empathize with", "Donate to"],
    chaPrefixes = ["Ally with", "Infiltrate", "Build Reputation with", "Placate", "Impersonate"];
  var rand = Math.floor(Math.random() * 100);
  switch(Ability) {
    case 'Strength':
      return strPrefixes[rand%strPrefixes.length] + " the " + generator("miscellaneous", "anime_attacks", 1)[0];
    case 'Dexterity':
      return dexPrefixes[rand%dexPrefixes.length] + " the " + generator("towns_and_cities", "apocalypse_towns", 1)[0];
    case 'Constitution':
      return conPrefixes[rand%conPrefixes.length] + " the " + generator("miscellaneous", "attack_moves", 1)[0];
    case 'Intelligence':
      return intPrefixes[rand%intPrefixes.length] + " the " + generator("weapons", "magic_books", 1)[0];
    case 'Wisdom':
      return wisPrefixes[rand%wisPrefixes.length] + " the " + generator("places", "orphanages", 1)[0];
    case 'Charisma':
      return chaPrefixes[rand%chaPrefixes.length] + " the " + generator("miscellaneous", "alliances", 1)[0];
  }
  return "Verbing the Noun"
},
DialogDelegate = {
  response: {
    directives:[
    {
      type: 'Dialog.Delegate'
    }
    ],
    shouldEndSession: false
  }
},
dynamoParamsTemplate = {
  TableName: "DailyDaggers-test"
},
dynamoQuestsTableTemplate = {
  TableName: "DailyDaggers-Quests"
}
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
      questsToDate: 0,
      bangs: 0
    }
  }
},
dynamoQuestTemplate = function(userId, questId) {
  return {
    Item: {
      userId: userId,
      questId: questId,
      quest: {},
      questStatus: 'open'
    }
  }
};

const api = botBuilder(
  function (message, originalRequest) {
    'use strict';
    console.log("-----RECEIVED REQUEST--------------------------------------------");
    console.log(getIntentName(originalRequest.body));
    console.log(originalRequest.body);
    var user = originalRequest.body.session.user.userId;
    if (originalRequest.body.request.type === 'LaunchRequest') {
       // just return a text message to have it automatically packaged
       // as a PlainText Alexa response, continuing the session
       return {
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: "The pleasure is mine. What can I do for you?"
          },
          shouldEndSession: false
        }
      };
    // you can use all the Alexa request properties from originalRequest.body
    } else {
      //Most requests will require user data.
      var params = Object.assign({}, dynamoParamsTemplate, { Key: { userId: user }});
      console.log("Dynamo Get for " + JSON.stringify(params))

      try {
        return dynamoDb.get(params).promise().then(function(data) {

          /**
          * Handler Start
          */
          //Should only happen on initial use.
          if(data.Item == null) {
            params = Object.assign({}, dynamoParamsTemplate, dynamoItemTemplate(user));
            try {
              return dynamoDb.put(params).promise().then(function(data) {
                console.log("Successfully wrote to Dynamo Table : " + data);
              }).catch(function(err){
                console.log("Could not write to DynamoDB : " + err)
                return "Sorry! Can't seem to find my pen. Come back in a bit.";
              }
              );
            } catch (error) {
              console.log(error);
              return "Sorry, I hit an error";
            }
          }
          // message.text has all intent placeholders joined together, for quick access
          if (getIntentName(originalRequest.body) === 'CreateTask') {
            if (originalRequest.body.request.dialogState === 'STARTED') {
              console.log("Dialog started")
              console.log("returning " + JSON.stringify(DialogDelegate));
              return DialogDelegate;
            } else if (originalRequest.body.request.dialogState === 'IN_PROGRESS') {
              console.log("Dialog in Prog")
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

            console.log("Moving to actual creation...")
            try {
              //Create the quest, update the user data.
              var questId = data.Item.questsToDate + 1;
              var questData = Object.assign({}, dynamoQuestTemplate(user, questId));
              var difficulty = extractSlotValue(originalRequest.body, "Difficulty")
              var statType = extractSlotValue(originalRequest.body, "Ability")
              questData.Item.quest = {
                styledTitle: generateTitle(statType, difficulty),
                description: extractNonERValue(originalRequest.body, "Description"),
                difficulty: difficulty,
                stat: statType,
                target: extractNonERValue(originalRequest.body, "TargetDate")
              };
              data.Item.questsToDate = questId;
              params = Object.assign({}, dynamoParamsTemplate, data);
              var questParams = Object.assign({}, dynamoQuestsTableTemplate, questData);
              console.log("Dynamo Put for quest" + JSON.stringify(questParams)); 
              try {
                return dynamoDb.put(questParams).promise().then(function(data) {
                  console.log("Dynamo Put for user"); 

                  return dynamoDb.put(params).promise().then(function(data) {
                    console.log("Successfully wrote to Dynamo Table");
                    //Everything worked out fine!
                    return {
                      response: {
                        outputSpeech: {
                          type: 'PlainText',
                          text: ("Great! I'll keep a tab on your " + 
                            extractSlotValue(originalRequest.body, "Ability") + 
                            " quest.")
                        },
                        shouldEndSession: false
                      }
                    };
                  });
                }).catch(function(err){
                  console.log("Could not write to DynamoDB : " + err)
                  return "Sorry! Can't seem to find my pen. Write it down and come back in a bit.";
                });
              } catch (error) {
                console.log("user put : " + error);
                return "Sorry, I hit an error";
              }
            } catch (error) {
              console.log("quest put : " + error);
              return "Sorry, I hit an error";
            }
          } else if (getIntentName(originalRequest.body) === 'GetTaskInfo') {
          } else if (getIntentName(originalRequest.body) === 'CompleteTask') {
          } else if (getIntentName(originalRequest.body) === 'GetOpenTasks') {
            // dynamo get all start (quests for the user id).
            try {
              var settings = data.Item.settings;
              var openIds = data.Item.open;
              var queryParams = Object.assign({}, dynamoQuestsTableTemplate, {
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: 'questStatus = :status',
                ExpressionAttributeValues: {
                  ":userId": user,
                  ":status": "open"
                }
              });
              console.log("Dynamo Query for " + JSON.stringify(queryParams))
              return dynamoDb.query(queryParams).promise().then(function(data) {
                console.log("Query Results: " + JSON.stringify(data))
                var openTitles = "";
                for (var i = 0; i < data.Items.length; i++) {
                  var item = data.Items[i];
                  var quest = item.quest;
                  console.log(quest);
                  //From the filtered query results
                  //Append Title
                  if (settings.styledTitle) {
                    openTitles += ("Quest " + item.questId + ": " +quest.styledTitle);
                  } else {
                    openTitles += ("Quest " + item.questId + ": " +quest.description);
                  }

                  //Comma or Conjuction
                  if (i === (data.Items.length - 2)) {
                    openTitles += ", and "
                  } else if (i < data.Items.length - 2) {
                    openTitles += ", "
                  }
                }

                return {
                  response: {
                    outputSpeech: {
                      type: 'PlainText',
                      text: ("These quests are still open: " + openTitles)
                    },
                    shouldEndSession: false
                  }
                };
              }).catch(function(error) {
                  console.log("Could not query DynamoDB : " + error)
                  return "Sorry! I can't find my notes. Come back in a bit.";

              });
            } catch (error) {
              console.log("quests get all: " + error);
              return "Sorry, I hit an error";
            }
          } else if (getIntentName(originalRequest.body) === 'CheckStats') {
          } else if (getIntentName(originalRequest.body) === 'GetLevel') {
          } else if (getIntentName(originalRequest.body) === 'Challenge') {
          } else if (getIntentName(originalRequest.body) === 'DeleteTask') {
          } else if (getIntentName(originalRequest.body) === 'Settings'){
          } else if (getIntentName(originalRequest.body) === 'AMAZON.HelpIntent'){
          } else if (getIntentName(originalRequest.body) === 'AMAZON.FallbackIntent'){
            return {
              response: {
                outputSpeech: {
                  type: 'PlainText',
                  text: ("Had something in my ear, could you say that again?")
                },
                shouldEndSession: false
              }
            }
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

          /**
          * Handler End
          */

        }).catch(function (error) {
          console.log("Could not get from DynamoDB : " + error)
          return "Sorry! Can't seem to find my notebook. Please come back in a bit."
        });
      } catch (error) {
        console.log("Error during Get promise : " + error);
        return "Sorry! I hit an error";
      }
    }
  },
  { platforms: ['alexa'] }
);
module.exports = api;