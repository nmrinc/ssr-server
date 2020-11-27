//@concept BASIC AUTH STRATEGY

const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const boom = require('@hapi/boom');
const axios = require('axios');
const { config } = require('../../../config');

passport.use(
  new BasicStrategy(async (email, password, cb) => {
    try {
      //@a To make the request use axios library, passing the conf object
      const { data, status } = await axios({
        url: `${config.apiUrl}/api/auth/sign-in`,
        method: 'post',
        auth: {
          password,
          username: email
        },
        data: {
          apiKeyToken: config.apiKeyToken
        }
      });

      //@a If there's no data or the status it's different to 200, return a boom error
      if (!data || status !== 200) { return cb(boom.unauthorized(), false); }

      return cb(null, data);
    } catch (e) {
      cb(e);
    }
  })
);
