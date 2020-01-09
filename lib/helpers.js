var crypto = require('crypto');
var config = require('../config');
var queryString = require("querystring");
var https = require("https");

var helpers = {
    hash: function (input) {
        if (typeof (input) == 'string' && input.length > 0) {
            var hash = crypto.createHmac("sha256", config.hasingSecret).update(input).digest('hex');
            return hash;
        } else {
            return false;
        }
    },
    parseJson: function (input) {
        try {
            return JSON.parse(input);
        } catch (e) {
            return {};
        }
    },
    createRandomString: function (len) {
        len = typeof (len) == 'number' && len > 0 ? len : false;

        if (len) {
            var pc = 'abcdefghijklmnopqrstuvwxyz0123456789';
            var str = '';

            for (let i = 1; i <= len; i++) {
                var rndc = pc.charAt(Math.floor(Math.random() * pc.length));
                str += rndc
            }

            return str;
        } else {
            return false;
        }
    },
    sendTwillioSms: function (phone, message, callback) {
        phone = typeof (phone) == 'string' && phone.length === 8 ? phone : false;
        message = typeof (message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message : false;

        if (phone && message) {
            var payload = {
                "From": config.twilio.fromPhone,
                "To": "+373" + phone,
                "Body": message
            };

            var stringPaylod = queryString.stringify(payload);

            var requestDetails = {
                protcol: 'https',
                hostname: 'api.twilio.com',
                method: 'POST',
                path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
                auth: config.twilio.accountSid + ':' + config.twilio.authToken,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(stringPaylod),
                }
            };

            var req = https.request(requestDetails, function (res) {
                var status = res.statusCode;
                if (status == 200 || status == 201) {
                    callback(false);
                } else {
                    callback("Error in twilio call.");
                }
            });

            req.on('error', function (err) {
                callback(err);
            });

            req.write(stringPaylod);

            req.end();
        } else {
            callback("Given parameters were missing or invalid.");
        }
    }
};

module.exports = helpers;