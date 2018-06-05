# Debugging

### DynamoDB

### Claudia Bot Builder
#### Missing Alexa App name
```
TypeError: Cannot read property 'replace' of undefined
at Object.decode (/var/task/node_modules/claudia-bot-builder/lib/utils/env-utils.js:8:27)
at bot.then.botReply (/var/task/node_modules/claudia-bot-builder/lib/alexa/setup.js:15:54)
at <anonymous>
at process._tickDomainCallback (internal/process/next_tick.js:228:7)
```

**Solution** : Your claudia environment is not configured for the current lambda version. You must run this command each time you create a new version, e.g. development, production, etc. Run the `claudia update ...<any-other-args-here>` command with the `--configure-alexa-skill` arg.