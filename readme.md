# P2PChatjs

A simple P2P Cache for Javascript (Browser and NodeJS)

Basically everyone who loads the script, is able to save and provide hashed Data to every other Peer.
This is called a distributed Cache.
## Usage

require bundle.js and use it like:

```javascript
const p2pcache = require("./p2pcache");
p2pcache.save("key","value");
let fetch = p2pcache.get("key");

```
