const WebSocket = require('ws');
const app = require('express')();
const server = require('http').Server(app);
const { v4: uuid } = require('uuid');
const $ = require('jquery');

var canGenerate = false;
var generating = false;;

const events = `
AdditionalContentLoaded
AgentCommand
AgentCreated
ApiInit
AppPaused
AppResumed
AppSuspended
AwardAchievement
BlockBroken
BlockPlaced
BoardTextUpdated
BossKilled
CameraUsed
CauldronUsed
ChunkChanged
ChunkLoaded
ChunkUnloaded
ConfigurationChanged
ConnectionFailed
CraftingSessionCompleted
EndOfDay
EntitySpawned
FileTransmissionCancelled
FileTransmissionCompleted
FileTransmissionStarted
FirstTimeClientOpen
FocusGained
FocusLost
GameSessionComplete
GameSessionStart
HardwareInfo
HasNewContent
ItemAcquired
ItemCrafted
ItemDestroyed
ItemDropped
ItemEnchanted
ItemSmelted
ItemUsed
JoinCanceled
JukeboxUsed
LicenseCensus
MascotCreated
MenuShown
MobInteracted
MobKilled
MultiplayerConnectionStateChanged
MultiplayerRoundEnd
MultiplayerRoundStart
NpcPropertiesUpdated
OptionsUpdated
performanceMetrics
PackImportStage
PlayerBounced
PlayerDied
PlayerJoin
PlayerLeave
PlayerMessage
PlayerTeleported
PlayerTransform
PlayerTravelled
PortalBuilt
PortalUsed
PortfolioExported
PotionBrewed
PurchaseAttempt
PurchaseResolved
RegionalPopup
RespondedToAcceptContent
ScreenChanged
ScreenHeartbeat
SignInToEdu
SignInToXboxLive
SignOutOfXboxLive
SpecialMobBuilt
StartClient
StartWorld
TextToSpeechToggled
UgcDownloadCompleted
UgcDownloadStarted
UploadSkin
VehicleExited
WorldExported
WorldFilesListed
WorldGenerated
WorldLoaded
WorldUnloaded`

function setBlockCommand(x, y, z, blockType) {
    return JSON.stringify({
        "body": {
            "origin": {
                "type": "player"
            },
            "commandLine": `setblock ${x} ${y} ${z} ${blockType}`,
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

function teleportPlayer(x, y, z) {
    return JSON.stringify({
        "body": {
            "origin": {
                "type": "player"
            },
            "commandLine": `tp ${x} ${y} ${z}`,
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

// Creates a JSON string for subscribing "say" events
function subscribePlayerChatEventCommand() {
    return JSON.stringify({
        "body": {
            "eventName": "PlayerMessage"
        },
        "header": {
            "requestId": uuid(), // UUID
            "messagePurpose": "subscribe",
            "version": 1,
            "messageType": "commandRequest"
        }
    });
}

function subscribeChunkLoadedEvent() {
    return JSON.stringify({
        "body": {
            "eventName": "ChunkLoaded"
        },
        "header": {
            "requestId": uuid(), // UUID
            "messagePurpose": "subscribe",
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


const wss = new WebSocket.Server({server});

wss.on('connection', socket => {
    console.log('A client has connected!');

    if (socket.readyState == WebSocket.OPEN) {
        setCanGenerate(true);
    }
    socket.send(subscribePlayerChatEventCommand());
    socket.send(subscribeChunkLoadedEvent());
    for (var event of events.split("\n")) {
        socket.send(subscribeEvent(event));
    }

    socket.on('message', packet => {
        const res = JSON.parse(packet);
        if (res.header.messagePurpose === 'event' && res.body.properties.Sender !== 'External') {
            console.log(res.body.eventName)
            if (res.body.eventName === 'WorldFilesListed') {
                setCanGenerate(false);
            }
            else if (res.body.eventName === 'WorldLoaded') {
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
                client.send(teleportPlayer(5, 5, 5), err => handleError(err));
            }
        });
    }
}

function setCanGenerate(canGen) {
    if (canGen) {
        canGenerate = true;
        $('#settings').show();
    }
    else {
        canGenerate = false;
        generating = false;
        $('#settings').hide();
    }
}

function handleError(err) {
    if (err != undefined) {
        alert(`An error has occurred: ${err.message}`)
    }
}

server.listen(3000, () => {
    let address = wss.address()
    console.log(`Listening on ${address.address}:${address.port}`);
});