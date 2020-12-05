const passport = require('passport');
const axios = require('axios');
const boom = require('@hapi/boom');
const { get } = require('lodash');
var TwitterStrategy = require('passport-twitter').Strategy;

const { config } = require("../../../config");

passport.use(new TwitterStrategy({
  //@o As Twitter use OAuth1.0 We need to pass a consumerKey and a consumerSecret
  consumerKey: config.twitterConsumerKey,
  consumerSecret: config.twitterConsumerSecret,
  callbackURL: "/auth/twitter/callback",
  includeEmail: true,
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { data, status } = await axios({
        url: `${config.apiUrl}/api/auth/sign-provider`,
        method: "post",
        data: {
          name: profile.displayName,
          //@o To get the email use the lodash get library. If there's no email, build one with the username
          email: get(profile, 'emails.0.value', `${profile.username}@twitter.com`),
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