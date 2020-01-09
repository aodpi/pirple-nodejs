var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var lib = {
    baseDir: path.join(__dirname, '/../.logs/')
};

lib.append = function (file, string, callback) {
    var filePath = path.join(lib.baseDir, file + ".log");

    fs.open(filePath, "a", function (err, file) {
        if (!err && file) {
            fs.appendFile(file, string + "\n", function (err) {
                if (!err) {
                    fs.close(file, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback("Error closing file.");
                        }
                    })
                } else {
                    callback("Error appending file.");
                }
            });
        } else {
            callback("Could not open file for appending.");
        }
    });
}

lib.list = function (includeCompressed, callback) {
    fs.readdir(lib.baseDir, function (err, data) {
        if (!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(function (fileName) {
                if (fileName.indexOf(".log") > -1) {
                    trimmedFileNames.push(fileName.replace(".log", ""));
                }

                if (fileName.indexOf('.gz.b64') > -1 && includeCompressed) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });

            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
       }
    });
}

lib.compress = function () {
    
}
module.exports = lib;