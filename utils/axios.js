const logger = require('./logger');
const config = require('../config');

const axiosRetry = require('axios-retry');
const axios = require('axios');

axiosRetry(axios, {
    retries: config.requestRetry,
    retryCondition: () => true,
    retryDelay: (count, err) => {
        logger.error(`Request ${err.config.url} fail, retry attempt #${count}: ${err}`);
        return 100;
    },
});

module.exports = axios;
