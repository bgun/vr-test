var express = require('express');

var server = express();
var PORT = process.env.PORT || 9099;

server.use(express.static('./'));
server.use(express.static('./build'));

console.log("Server listening on port %d", PORT);
server.listen(PORT);
