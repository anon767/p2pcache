const DreamTimeWrapper = require("./DreamTimeWrapper");
var crypto = require('crypto');

var graph, room;
var currentRequests = [];

function debug(msg) {
    console.log(msg);
}

function localSet(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}


function localGet(key) {
    let local = sessionStorage.getItem(key);
    if (local !== null && local != "{}")
        return JSON.parse(sessionStorage.getItem(key));
    else
        return null;
}

function isCached(key) {
    let local = sessionStorage.getItem(key);
    return local !== null && local != "{}";
}


function makeReadableName(fingerprint) {
    return fingerprint.substr(0, 5);
}

function hash(string) {
    return crypto.createHash("sha1").update(string).digest("hex");
}

function getArgumentFromMsg(msg) {
    return msg.split(" ")[1];
}

function sendIfExist(hash, wire) {
    if (isCached(hash)) {
        debug("send " + hash + " to " + wire.fingerprint);
        let local = localGet(hash);
        room.send([wire], "hit " + JSON.stringify({
            hash: hash,
            timestamp: local.timestamp,
            content: local.content
        }), debug);
    } else
        room.send([wire], "miss " + hash, debug);
}


function initP2pCache() {
    room = DreamTimeWrapper("test");
    room.on("left", function (wire) {
        decrementRequestWaits();
    });

    room.on("login", function () {

    });

    room.on("join", function (wire) {
        console.log(wire.fingerprint + " joined");
    });

    room.on("msg", function (msg, fingerprint, wire) {
        if (wire === null || fingerprint === room.client.fingerprint)
            return;
        if (msg.startsWith("request"))
            sendIfExist(getArgumentFromMsg(msg), wire);
        if (msg.startsWith("hit"))
            hitHappened(msg, wire);
        if (msg.startsWith("miss"))
            missHappened(msg, wire);
    });
}

function missHappened(msg, wire) {
    debug("missed by " + wire.fingerprint);
    let hash = msg.split("miss ")[1];
    if (currentRequests[hash]) {
        currentRequests[hash].miss += 1;
        if (currentRequests[hash].miss >= currentRequests[hash].wires) {
            currentRequests[hash].callBack(null);
            delete currentRequests[hash];
        }
    }
}

function hitHappened(msg, wire) {
    let args = msg.split("hit ")[1];
    debug("the msg: " + msg);
    let argsDecoded = JSON.parse(args);
    debug("got " + argsDecoded.hash + " from " + wire.fingerprint);
    localSet(argsDecoded.hash, {timestamp: argsDecoded.timestamp, content: argsDecoded.content});
    if (typeof currentRequests[argsDecoded.hash] !== "undefined") {
        currentRequests[argsDecoded.hash].callBack(argsDecoded.content);
        delete currentRequests[argsDecoded.hash];
    }
}

function decrementRequestWaits() {
    currentRequests.forEach(function (value, index) {
        r.wires -= 1;
        if (r.miss >= r.wires) {
            r.callBack(null);
            delete currentRequests[i];
        }
    });
}

function get(key, cb) {
    if (isCached(hash(key))) {
        debug("got " + hash(key) + " from local");
        cb(localGet(hash(key)));
        return;
    }

    if (room.client.wires.length <= 1) {
        debug("there is no one to ask");
        cb(null);
        return;
    }
    room.broadCast("request " + hash(key));
    currentRequests[hash(key)] = ({wires: room.client.wires.length, miss: 0, callBack: cb});
}

function save(key, value) {
    let hashedKey = hash(key);
    if (!isCached(hashedKey) || localGet(hashedKey).timestamp < Date.now() - 36000) {
        debug(hashedKey + " " + value + " set locally ");
        localSet(hashedKey, {timestamp: Date.now(), content: value});
        debug("tell everyone we have a hit locally");
        room.broadCast("hit " + JSON.stringify({
            hash: hashedKey,
            timestamp: Date.now(),
            content: value
        }));
    }
}

initP2pCache();

module.exports = {save: save, get: get, hash: hash};