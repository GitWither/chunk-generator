const WebSocket = require('ws');
const app = require('express')();
const server = require('http').Server(app);
const {
    v4: uuid
} = require('uuid');
const $ = require('jquery');
const { start } = require('repl');
const electorn = require('electron').remote;
const ip = require('ip');

const currentWindow = electorn.getCurrentWindow();

const durationTemplate = 'This generation will take approximately: %s hour(s)';

const intervalSeconds = 4;

var canGenerate = false;
var generating = false;

function teleportPlayer(client, newPos) {
    client.send(JSON.stringify({
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
    }));
}

function sendFormattedMessage(client, message) {
    client.send(JSON.stringify({
        "body": {
            "origin": {
                "type": "player"
            },
            "commandLine": `tellraw @a ${JSON.stringify({rawtext: [message]})}`,
            "version": 1
        },
        "header": {
            "requestId": uuid(),
            "messagePurpose": "commandRequest",
            "version": 1,
            "messageType": "commandRequest"
        }
    }));
}

function subscribeEvent(client, event) {
    client.send(JSON.stringify({
        "body": {
            "eventName": event
        },
        "header": {
            "requestId": uuid(),
            "messagePurpose": "subscribe",
            "version": 1,
            "messageType": "subscribe"
        }
    }));
}


const wss = new WebSocket.Server({
    server
});

wss.on('connection', socket => {
    console.log('A client has connected!');

    if (socket.readyState == WebSocket.OPEN) {
        setCanGenerate(true);
    }

    subscribeEvent(socket, 'WorldFilesListed');
    subscribeEvent(socket, 'WorldLoaded');

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
    if (canGenerate) {
        $('#start-button').prop('disabled', true);
        $('#stop-button').prop('disabled', false);
        wss.clients.forEach(client => {
            if (client.readyState == WebSocket.OPEN) {
                const center = {x: parseInt($('#center-x').val()), y: parseInt($('#center-y').val()), z: parseInt($('#center-z').val())}
                const size = {x: parseInt($('#dimensions-x').val()), z: parseInt($('#dimensions-x').val())}
                const sizeSquare = size.x * size.z;
                let chunksGenerated = 1;
                //Multiplying by 8 because: X - ((Xsize * 16) / 2)
                let startingPos = {x: center.x - size.x * 8, y: center.y, z: center.z - size.z * 8}
                let currentPos = {x: startingPos.x, y: startingPos.y, z: startingPos.z - 16}
                sendFormattedMessage(client, {text: 'Generation started!'});

                let interval = setInterval(function() {
                    if (currentPos.z >= center.z + size.z * 8) {
                        currentPos.x += 16;
                        currentPos.z = startingPos.z;
                        teleportPlayer(client, currentPos);
                    }
                    else {
                        currentPos.z += 16;
                        teleportPlayer(client, currentPos);
                    }
                    updateGenProgress(client, chunksGenerated, sizeSquare);
                    if (chunksGenerated++ >= sizeSquare) {
                        sendFormattedMessage(client, {text: 'Generation finished!'});
                        stopGeneration(interval);
                    }
                }, intervalSeconds * 1000);
            }
        });
    }
}

function stopGeneration(interval) {
    clearInterval(interval);
    updateGenProgress(null, 0, 1);
    $('#start-button').prop('disabled', false);
    $('#stop-button').prop('disabled', true);
    alert('Generation complete!');
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

function updateGenProgress(client, generated, max) {
    currentWindow.setProgressBar(generated / max);
    if (client) {
        sendFormattedMessage(client, {text: `Generated: ${generated}/${max}`});
    }
}

function updateDuration() {
    let x = $('#dimensions-x').val();
    let z = $('#dimensions-z').val();

    $('#duration').text((index, string) => {
        return durationTemplate.replace('%s', calculateGenDuration(x, z))
    });
}

function calculateGenDuration(x, z) {
    return Math.round((((x * z * intervalSeconds) / 3600) + Number.EPSILON) * 10) / 10;
}

function getConnectcommand() {
    let address = ip.address('public', 'ipv4');
    return `/connect ${address}:${wss.address().port}`;
}

server.listen(3000, () => {
    $('#command-output').val((index, value) => {
        return getConnectcommand();
    });
});