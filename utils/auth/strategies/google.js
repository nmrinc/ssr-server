/**
 * @concept
 * Google OpenId Strategy
 * @context
 * Based on google OpenId protocol.
 */

const passport = require('passport');
const axios = require('axios');
const boom = require('@hapi/boom');
const { OAuth2Strategy: GoogleStrategy } = require('passport-google-oauth');

const { config } = require('../../../config/index');

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: '/auth/google/callback'
    },
    //@o In this case, the received profile will be an object, so we need to parse it as a json.
    async (accessToken, refreshToken, { _json: profile }, done) => {
      try {
        const { data, status } = await axios({
          url: `${config.apiUrl}/api/auth/sign-provider`,
          method: 'post',
          data: {
            name: profile.name,
            email: profile.email,
            password: profile.id,
            apiKeyToken: config.apiKeyToken
          }
        });

        if (!data || status !== 200) {
          return done(boom.unauthorized(), false);
        }

        return done(null, data);
      } catch (e) {
        return done(e);
      }
    }
  )
);