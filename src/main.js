const WebSocket = require('ws');
const app = require('express')();
const server = require('http').Server(app);
const {
    v4: uuid
} = require('uuid');
const $ = require('jquery');
const { start } = require('repl');
const electorn = require('electron').remote;

const currentWindow = electorn.getCurrentWindow();

const durationTemplate = 'This generation will take approximately: %s hour(s)';

var canGenerate = false;
var generating = false;

function teleportPlayer(newPos) {
    return JSON.stringify({
        "body": {
            "origin": {
                "type": "player"
            },
            "commandLine": `tp ${newPos.x} ${newPos.y} ${newPos.z}`,
            "version": 1
        },
        "header": {
            "requestId": uuid(),
            "messagePurpose": "commandRequest",
            "version": 1,
            "messageType": "commandRequest"
        }
    });
}

function sendFormattedMessage(message) {
    return JSON.stringify({
        "body": {
            "origin": {
                "type": "player"
            },
            "commandLine": `tellraw @a ${JSON.stringify(message)}`,
            "version": 1
        },
        "header": {
            "requestId": uuid(),
            "messagePurpose": "commandRequest",
            "version": 1,
            "messageType": "commandRequest"
        }
    });
}

function subscribeEvent(event) {
    return JSON.stringify({
        "body": {
            "eventName": event
        },
        "header": {
            "requestId": uuid(), // UUID
            "messagePurpose": "subscribe",
            "version": 1,
            "messageType": "subscribe"
        }
    });
}


const wss = new WebSocket.Server({
    server
});

wss.on('connection', socket => {
    console.log('A client has connected!');

    if (socket.readyState == WebSocket.OPEN) {
        setCanGenerate(true);
    }

    socket.send(subscribeEvent('WorldFilesListed'));
    socket.send(subscribeEvent('WorldLoaded'))

    socket.on('message', packet => {
        const res = JSON.parse(packet);
        if (res.header.messagePurpose === 'event' && res.body.properties.Sender !== 'External') {
            if (res.body.eventName === 'WorldFilesListed') {
                setCanGenerate(false);
            } else if (res.body.eventName === 'WorldLoaded') {
                setCanGenerate(true);
            }
        }
    });

});

function beginGeneration() {
    console.log(canGenerate)
    if (canGenerate) {
        wss.clients.forEach(client => {
            if (client.readyState == WebSocket.OPEN) {
                let centerX = parseInt($('#center-x').val());
                let centerY = parseInt($('#center-y').val());
                let centerZ = parseInt($('#center-z').val());
                let sizeX = parseInt($('#dimensions-x').val());
                let sizeZ = parseInt($('#dimensions-z').val());
                let sizeSquare = sizeX * sizeZ;
                let chunksGenerated = 0;
                //Multiplying by 8 because: X - ((Xsize * 16) / 2)
                let startingPos = {x: centerX - sizeX * 8, y: centerY, z: centerZ - sizeZ * 8}
                client.send(teleportPlayer(startingPos), err => handleError(err));
                chunksGenerated++;
                client.send(sendFormattedMessage({rawtext: [{text: `Generated: ${chunksGenerated}/${sizeSquare}`}]}));
                currentWindow.setProgressBar(chunksGenerated / sizeSquare);
                let currentPos = {x: startingPos.x, y: startingPos.y, z: startingPos.z + 16}

                setInterval(function() {
                    if (chunksGenerated >= sizeSquare) {
                        clearInterval();
                    }
                    else {
                        if (currentPos.z >= centerZ + sizeZ * 8) {
                            currentPos.x += 16;
                            currentPos.z = startingPos.z;
                            client.send(teleportPlayer(currentPos));
                        }
                        else {
                            currentPos.z += 16;
                            client.send(teleportPlayer(currentPos));
                        }
                        chunksGenerated++;
                        client.send(sendFormattedMessage({rawtext: [{text: `Generated: ${chunksGenerated}/${sizeSquare}`}]}));
                        currentWindow.setProgressBar(chunksGenerated / sizeSquare);
                    }
                }, 4000);
            }
        });
    }
}

function stopGenerating() {
    clearInterval();
}


function setCanGenerate(canGen) {
    if (canGen) {
        canGenerate = true;
        $('#address').hide();
        $('#settings').show();
    } else {
        canGenerate = false;
        generating = false;
        $('#address').show();
        $('#settings').hide();
    }
}

function handleError(err) {
    if (err != undefined) {
        alert(`An error has occurred: ${err.message}`)
    }
}

function calculateDuration() {
    let x = $('#dimensions-x').val();
    let z = $('#dimensions-z').val();

    let duration = Math.round(((((x * z) * 4) / 3600) + Number.EPSILON) * 10) / 10;
    $('#duration').text((index, string) => {
        return durationTemplate.replace('%s', duration)
    });
}

server.listen(3000, () => {
    let address = wss.address()
    console.log(`Listening on ${address.address}:${address.port}`);
});