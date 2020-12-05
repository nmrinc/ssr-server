const passport = require('passport');
const axios = require('axios');
const boom = require('@hapi/boom');
const { get } = require('lodash');
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

const { config } = require("../../../config");

passport.use(new LinkedInStrategy({
  clientID: config.linkedinClientId,
  clientSecret: config.linkedinClientSecret,
  callbackURL: "/auth/linkedin/callback",
  scope: ['r_emailaddress', 'r_liteprofile'],
  state: false
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { data, status } = await axios({
        url: `${config.apiUrl}/api/auth/sign-provider`,
        method: "post",
        data: {
          name: profile.displayName,
          email: get(profile, 'emails.0.value', `${profile.username}@linkedin.com`),
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
));