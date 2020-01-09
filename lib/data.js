var fs = require('fs');
var path = require('path');

var lib = {};

lib.baseDir = path.join(__dirname, '/../data/');

lib.create = function (dir, file, data, callback) {
    var filepath = path.join(lib.baseDir, dir + "/", file + ".json");
    fs.open(filepath, "wx", function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data);

            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Could not close file.');
                        }
                    });
                } else {
                    callback('Could not write to file.');
                }
            });
        } else {
            callback("Could not create new file.");
        }
    });
};

lib.read = function (dir, file, callback) {
    var filePath = path.join(lib.baseDir, dir + "/", file + ".json");
    fs.readFile(filePath, function (err, data) {
        try {
            var obj = JSON.parse(data);
            callback(err, obj);
        } catch (e) {
            callback(err, data);
        }
    });
}

lib.update = function (dir, file, newData, callback) {
    var filePath = path.join(lib.baseDir, dir + "/", file + ".json");

    fs.open(filePath, "r+", function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(newData);

            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback("Error closing file.");
                        }
                    });
                } else {
                    callback("Error writing to existing file.");
                }
            });
        } else {
            callback("Could not find this file.")
        }
    });
}

lib.delete = function (dir, file, callback) {
    var filePath = path.join(lib.baseDir, dir + "/", file + ".json");

    fs.unlink(filePath, function (err) {
        if (!err) {
            callback(false);
        } else {
            callback("Could not delete file.")
        }
    });
}

lib.list = function (dir, callback) {
    var dirPath = path.join(lib.baseDir, dir + "/");
    fs.readdir(dirPath, function (err, files) {
        if (!err && files && files.length > 0) {
            var trimmedFileNames = [];
            files.forEach(function (file) {
                trimmedFileNames.push(file.replace(".json", ""));
            });

            callback(false, trimmedFileNames);
        } else {
            callback(err, files);
       }
    });
}

module.exports = lib;