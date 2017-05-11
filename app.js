var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

const VERIF_TOKEN = process.env.VERIFICATION_TOKEN;
const ACC_TOKEN = process.env.PAGE_ACCESS_TOKEN;

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.send('Deployed!');
});

app.get("/webhook", function(req, res) {
    if (req.query["hub.verify_token"] === VERIF_TOKEN) {
        console.log("Verified webhook");
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        console.error("Verification failed. The tokens do not match.");
        res.sendStatus(403);
    }
});

app.post('/webhook', function(req, res) {
    var data = req.body;
    console.log("Webhook received :: " + data);

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
        res.sendStatus(200);
    }
});

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var payload = event.postback.payload;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (payload === "Greeting") {
        sendTextMessage(senderID, "Merhaba!");
    } else {
        console.log(messageText);
        if (messageText) {
            switch (messageText) {
                case "code":
                    sendTextMessage(senderID, " is awesome!");
                default:
                    sendTextMessage(senderID, messageText);
            }
        }
    }
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: ACC_TOKEN },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
});