// Dependencies
var http = require('http');

var url = require('url');
var stringDecoder = require("string_decoder").StringDecoder;
var cfg = require('../config');
var router = require('./router');
var helpers = require('./helpers');
var handlers = require('./handlers');
var util = require('util');
var debug = util.debuglog('server');

var server = {};

server.unifiedServer = function (req, res) {
    var parsedUrl = url.parse(req.url, true);

    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    var method = req.method.toLowerCase();
    var query = parsedUrl.query;
    var headers = req.headers;

    var decoder = new stringDecoder("utf-8");
    var buffer = '';

    req.on('data', function (data) {
        buffer += decoder.write(data);
    });

    req.on('end', function () {
        buffer += decoder.end();

        var chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': query,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJson(buffer)
        };

        chosenHandler(data, function (status, output) {
            status = typeof (status) == 'number' ? status : 200;
            output = typeof (output) == 'object' ? output : {};

            var outString = JSON.stringify(output);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(status);
            res.end(outString);

            if (status == 200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + status);
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + status);
            }
        });
    });
}

server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

server.init = function () {
    server.httpServer.listen(cfg.port, function () {
        console.log("\x1b[36m%s\x1b[0m'", "Server listening on " + cfg.port + " env: " + cfg.env);
    });
}

module.exports = server;