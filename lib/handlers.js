var _data = require('./data');
var helpers = require('./helpers');
var cfg = require('../config');

var handlers = {
    sample: function (data, callback) {
        callback(200, {
            'name': 'sample handler'
        });
    },
    ping: function (data, callback) {
        callback(200);
    },
    users: function (data, callback) {
        var accept = ['post', 'get', 'put', 'delete'];
        if (accept.indexOf(data.method) != -1) {
            handlers._users[data.method](data, callback);
        } else {
            callback(405);
        }
    },
    tokens: function (data, callback) {
        var accept = ['post', 'get', 'put', 'delete'];
        if (accept.indexOf(data.method) != -1) {
            handlers._tokens[data.method](data, callback);
        } else {
            callback(405);
        }
    },
    checks: function (data, callback) {
        var accept = ['post', 'get', 'put', 'delete'];
        if (accept.indexOf(data.method) != -1) {
            handlers._checks[data.method](data, callback);
        } else {
            callback(405);
        }
    },
    notFound: function (data, callback) {
        callback(404);
    }
}

handlers._tokens = {
    post: function (data, callback) {
        var payload = data.payload;

        var phone = typeof (payload.phone) == 'string' && payload.phone.trim().length === 9 ? payload.phone.trim() : false;
        var password = typeof (payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

        if (phone && password) {
            _data.read("users", phone, function (err, data) {
                if (!err && data) {
                    var userData = JSON.parse(data);

                    var hashedPassword = helpers.hash(password);

                    if (hashedPassword === userData.hashedPassword) {
                        var tokenId = helpers.createRandomString(20);

                        var expires = Date.now() + 1000 * 60 * 60;

                        var tokenObject = {
                            'phone': phone,
                            'id': tokenId,
                            'expires': expires
                        };

                        _data.create("tokens", tokenId, tokenObject, function (err) {
                            if (!err) {
                                callback(200, tokenObject);
                            } else {
                                callback(500, { "Error": "Could not generate token." });
                            }
                        });
                    } else {
                        callback(400, { "Error": "The provided password is not correct." });
                    }
                } else {
                    callback(400, { "Error": "Could not find the specified user." });
                }
            });
        } else {
            callback(400, { "Error": "Missing required fields." });
        }
    },
    get: function (data, callback) {
        var tokenId = data.queryStringObject.tokenId;

        tokenId = typeof (tokenId) == 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;

        if (tokenId) {
            _data.read("tokens", tokenId, function (err, tokenData) {
                if (!err && tokenData) {
                    callback(200, tokenData);
                } else {
                    callback(404);
                }
            })
        } else {
            callback(400, { "Error": "Missing required field." });
        }
    },
    put: function (data, callback) {
        var tokenId = data.payload.tokenId;
        var extend = data.payload.extend;

        tokenId = typeof (tokenId) == 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;
        extend = typeof (extend) == 'boolean' && extend == true ? true : false;

        if (tokenId && extend) {
            _data.read('tokens', tokenId, function (err, tokenData) {
                if (!err && tokenData) {
                    if (tokenData.expires > Date.now()) {
                        tokenData.expires = Date.now() + 1000 * 60 * 60;

                        _data.update("tokens", tokenId, tokenData, function (err) {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, { "Error": "Could not update token expiration date." });
                            }
                        });
                    } else {
                        callback(400, { "Error": "Token is expired" });
                    }
                } else {
                    callback(400, { "Error": "Specified token does not exist." });
                }
            })
        } else {
            callback(400, { "Error": "Missing required fields or fields are invalid." });
        }

    },
    delete: function (data, callback) {
        var tokenId = data.payload.tokenId;

        tokenId = typeof (tokenId) == 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;

        if (tokenId) {
            _data.read("tokens", tokenId, function (err, tokenData) {
                if (!err && tokenData) {
                    _data.delete("tokens", tokenId, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { "Error": "Could not delete the specified token." });
                        }
                    })
                } else {
                    callback(400, { "Error": "Could not find the specified token." });
                }
            })
        } else {
            callback(400, { "Error": "Missing required field." });
        }
    },
    verifyToken: function (id, phone, callback) {
        _data.read("tokens", id, function (err, tokenData) {
            if (!err && tokenData) {
                if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                    callback(true)
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        });
    }
}

handlers._checks = {
    post: function (data, callback) {
        var payload = data.payload;

        var protocol = typeof (payload.protocol) == 'string' && ['http', 'https'].indexOf(payload.protocol) > -1 ? payload.protocol : false;
        var url = typeof (payload.url) == 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false;
        var method = typeof (payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(payload.method) > -1 ? payload.method : false;
        var successCodes = typeof (payload.successCodes) == 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
        var timeoutSeconds = typeof (payload.timeoutSeconds) == 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

        if (protocol && url && method && successCodes && timeoutSeconds) {
            var tokenId = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            _data.read('tokens', tokenId, function (err, tokenData) {
                if (!err && tokenData) {
                    var userPhone = tokenData.phone;

                    _data.read("users", userPhone, function (err, userData) {
                        if (!err && userData) {
                            var userChecks = typeof (userData.checks) && userData.checks instanceof Array ? userData.checks : [];

                            if (userChecks.length <= cfg.maxChecks) {
                                var checkId = helpers.createRandomString(20);

                                var checkObject = {
                                    id: checkId,
                                    userPhone: userData.phone,
                                    protocol: protocol,
                                    url: url,
                                    method: method,
                                    successCodes: successCodes,
                                    timeoutSeconds: timeoutSeconds
                                };

                                _data.create("checks", checkId, checkObject, function (err) {
                                    if (!err) {
                                        userData.checks = userChecks;
                                        userData.checks.push(checkId);

                                        _data.update("users", userData.phone, userData, function (err) {
                                            if (!err) {
                                                callback(200);
                                            } else {
                                                callback(500, { "Error": "Could not add check" });
                                            }
                                        });
                                    } else {
                                        callback(500, { "Error": "Could not create check." });
                                    }
                                });
                            } else {
                                callback(400, { "Error": "The user has max checks." });
                            }
                        } else {
                            callback(403, { "Error": "Invalid token" });
                        }
                    });
                } else {
                    callback(403, { "Error": "Invalid token." });
                }
            });
        } else {
            callback(400, { "Error": "Missing required fields." });
        }

    },
    get: function (data, callback) {
        var checkId = typeof (data.queryStringObject.checkId) == 'string' && data.queryStringObject.checkId.trim().length === 20 ? data.queryStringObject.checkId.trim() : false;

        if (checkId) {
            _data.read("checks", checkId, function (err, checkData) {
                if (!err && checkData) {
                    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            callback(200, checkData);
                        } else {
                            callback(403, { "Erorr": "Invalid token." });
                        }
                    })
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, { "Error": "Missing required fields." });
        }
    },
    put: function (data, callback) {
        var payload = data.payload;
        var checkId = typeof (payload.checkId) == 'string' && payload.checkId.length === 20 ? payload.checkId : false;

        if (checkId) {

            var protocol = typeof (payload.protocol) == 'string' && ['http', 'https'].indexOf(payload.protocol) > -1 ? payload.protocol : false;
            var url = typeof (payload.url) == 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false;
            var method = typeof (payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(payload.method) > -1 ? payload.method : false;
            var successCodes = typeof (payload.successCodes) == 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
            var timeoutSeconds = typeof (payload.timeoutSeconds) == 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

            if (protocol || url || method || successCodes || timeoutSeconds) {
                _data.read("checks", checkId, function (err, checkData) {
                    if (!err && checkData) {
                        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                        handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                            if (tokenIsValid) {
                                if (protocol) {
                                    checkData.protocol = protocol;
                                }

                                if (url) {
                                    checkData.url = url;
                                }

                                if (method) {
                                    checkData.method = method;
                                }

                                if (successCodes) {
                                    checkData.successCodes = successCodes;
                                }

                                if (timeoutSeconds) {
                                    checkData.timeoutSeconds = timeoutSeconds;
                                }

                                _data.update("checks", checkId, checkData, function (err) {
                                    if (!err) {
                                        callback(200);
                                    } else {
                                        callback(500, { "Error": "Could not update check." });
                                    }
                                });
                            } else {
                                callback(403);
                            }
                        });
                    } else {
                        callback(400, { "Error": "Invalid check id." });
                    }
                });
            } else {
                callback(400, { "Error": "Missing field to update." });
            }
        } else {
            callback(400, { "Error": "Missing required field, checkId" });
        }
    },
    delete: function (data, callback) {
        var checkId = typeof (data.queryStringObject.checkId) == 'string' && data.queryStringObject.checkId.length === 20 ? data.queryStringObject.checkId : false;

        if (checkId) {
            _data.read("checks", checkId, function (err, checkData) {
                if (!err && checkData) {
                    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            _data.delete("checks", checkId, function (err) {
                                if (!err) {
                                    _data.read("users", checkData.userPhone, function (err, userData) {
                                        if (!err && userData) {
                                            var userChecks = typeof (userData.checks) && userData.checks instanceof Array ? userData.checks : [];

                                            var index = userChecks.indexOf(checkId);

                                            if (index > -1) {
                                                userChecks.splice(index, 1);

                                                _data.update("users", checkData.userPhone, userData, function (err) {
                                                    if (!err) {
                                                        callback(200);
                                                    } else {
                                                        callback(500, { "Error": "Could not update the user." })
                                                    }
                                                });
                                            } else {
                                                callback(500, { "Error": "Could not find the check on the user object so could not remove it." });
                                            }
                                        } else {
                                            callback(500, { "Error": "Malformed check. Invalid user for check." });
                                        }
                                    });
                                } else {
                                    callback(500, { "Error": "Could not delete the check data." });
                                }
                            })
                        } else {
                            callback(403, { "Error": "Invalid token." });
                        }
                    });
                } else {
                    callback(400, { "Error": "The specified check does not exist." });
                }
            });
        } else {
            callback(400, { "Error": "Missing required field checkId." });
        }
    }
}

handlers._users = {
    post: function (data, callback) {
        var payload = data.payload;

        var firstName = typeof (payload.firstName) == 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
        var lastName = typeof (payload.lastName) == 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
        var phone = typeof (payload.phone) == 'string' && payload.phone.trim().length === 9 ? payload.phone.trim() : false;
        var password = typeof (payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;
        var tosAgreement = typeof (payload.tosAgreement) == 'boolean' && payload.tosAgreement === true ? true : false;

        if (firstName && lastName && tosAgreement && password && phone) {
            _data.read("users", phone, function (err, data) {
                if (err) {
                    var hashedPassword = helpers.hash(password);
                    if (hashedPassword) {
                        var user = {
                            'firstName': firstName,
                            'lastName': lastName,
                            'phone': phone,
                            'hashedPassword': hashedPassword,
                            'tosAgreement': true
                        };

                        _data.create("users", phone, user, function (err) {
                            if (!err) {
                                callback(200);
                            } else {
                                console.log(err);
                                callback(500, { "Error": "Could not create the new user." });
                            }
                        });
                    } else {
                        callback(500, { "Error": "Could not has the user password" });
                    }
                } else {
                    callback(400, { "Error": "User already exists" });
                }
            });
        } else {
            callback(400, { "Error": "Missing required fields." });
        }
    },
    get: function (data, callback) {
        var phone = data.queryStringObject.phone;

        phone = typeof (phone) == 'string' && phone.length === 9 ? phone : false;

        if (phone) {
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    _data.read("users", phone, function (err, userData) {
                        if (!err) {
                            delete userData.hashedPassword;
                            callback(200, obj);
                        } else {
                            callback(404, { "Error": "This user does not exist." });
                        }
                    });
                } else {
                    callback(403, { "Error": "Missing required token in header or token is invalid." });
                }
            });
        } else {
            callback(400, { "Error": "Missing required field." });
        }
    },
    put: function (data, callback) {
        var phone = data.queryStringObject.phone;
        var payload = data.payload;

        phone = typeof (phone) == 'string' && phone.length === 9 ? phone : false;

        var firstName = typeof (payload.firstName) == 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
        var lastName = typeof (payload.lastName) == 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
        var password = typeof (payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

        if (phone) {

            if (firstName || lastName || password) {
                var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        _data.read("users", phone, function (err, userData) {
                            if (!err && userData) {
                                if (firstName) {
                                    userData.firstName = firstName;
                                }

                                if (lastName) {
                                    userData.lastName = lastName;
                                }

                                if (password) {
                                    userData.password = helpers.hash(password);
                                }

                                _data.update("users", phone, userData, function (err) {
                                    if (!err) {
                                        callback(200);
                                    } else {
                                        console.log(err);
                                        callback(500, { "Error": "Could not update the user." });
                                    }
                                });
                            } else {
                                callback(400, { "Errors": "This user does not exist." });
                            }
                        });
                    } else {
                        callback(403, { "Error": "Missing token header or token is invalid." });
                    }
                });
            } else {
                callback(400, { "Error": "Missing fields to update." });
            }
        } else {
            callback(400, { "Error": "Missing required field." });
        }
    },
    delete: function (data, callback) {
        var phone = data.queryStringObject.phone;
        phone = typeof (phone) == 'string' && phone.length === 9 ? phone : false;

        if (phone) {
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    _data.read("users", phone, function (err, data) {
                        if (!err && data) {
                            _data.delete("user", phone, function (err) {
                                if (!err) {
                                    var userChecks = typeof (userData.checks) && userData.checks instanceof Array ? userData.checks : [];
                                    var checksToDelete = userChecks.length;

                                    if (checksToDelete > 0) {
                                        var checksDeleted = 0;
                                        var deletionErrors = false;

                                        userChecks.forEach(function (checkId) {
                                            _data.delete("checks", checkId, function (err) {
                                                if (err) {
                                                    deletionErrors = true;
                                                }

                                                checksDeleted++;

                                                if (checksDeleted == checksToDelete) {
                                                    if (!deletionErrors) {
                                                        callback(200);
                                                    } else {
                                                        callback(500, { "Erorr": "Errors encountered when deleting checks." });
                                                    }
                                                }
                                            });
                                        });
                                    } else {
                                        callback(200);
                                    }
                                } else {
                                    callback(500, "Could not delete the user.");
                                }
                            })
                        } else {
                            callback(400, { "Error": "This user does not exist." });
                        }
                    });
                } else {
                    callback(403, { "Error": "Missing token header or token is invalid" });
                }
            });
        } else {
            callback(400, { "Error": "Missing required field" });
        }
    }
}


module.exports = handlers;