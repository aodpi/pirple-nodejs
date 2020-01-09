var environments = {
    staging: {
        port: 3000,
        env: 'staging',
        hasingSecret: 'secret123',
        maxChecks: 5,
        twilio: {
            accountSid: 'AC7f1037d8696842fab2ca41b9766e0d43',
            authToken: '29ddda5436eace231092312903b32f7b',
            fromPhone: '+373078452768'
        }
    },
    production: {
        port: 5000,
        env: 'production',
        hasingSecret: 'secret123',
        maxChecks: 5,
        twilio: {
            accountSid: 'AC7f1037d8696842fab2ca41b9766e0d43',
            authToken: '29ddda5436eace231092312903b32f7b',
            fromPhone: '+373078452768'
        }
    }
};

var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';


var env = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = env;