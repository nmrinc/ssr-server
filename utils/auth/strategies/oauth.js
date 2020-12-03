/**
 * @concept
 * OAuth 2.0 | Open Authorization Strategy
 * @context:
 * Is the industry-standard protocol for authorization.
 * @context:
 * OAuth 2.0 focuses on client developer simplicity while providing specific authorization flows for web applications, desktop applications, mobile phones, and living room devices
 * ##--
 * @o In this case using Google API & Services. https://console.developers.google.com/
*/

//@a require the libraries.
const passport = require('passport');
const axios = require('axios');
const boom = require('@hapi/boom');
const { OAuth2Strategy } = require('passport-oauth');

//@a require config file
const { config } = require('../../../config');

//@a Define Google OAuth flow urls
const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_INFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

//@a Define the OAuth2Strategy
const oAuth2Strategy = new OAuth2Strategy(
  //@a Pass the request credentials
  {
    authorizationURL: GOOGLE_AUTHORIZATION_ENDPOINT,
    tokenURL: GOOGLE_TOKEN_ENDPOINT,
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: "/auth/google-oauth/callback"
  },
  //@a With an async function with the oauth sign. Request the data.
  async (accessToken, refreshToken, profile, done) => {
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

    if (!data || status !== 200) { return done(boom.unauthorized(), false); }

    return done(null, data);
  }
);

//@a Implement how OAuth will define the profile
oAuth2Strategy.userProfile = function (accessToken, done) {

  //@a If the request was successful, get the data to build the profile.
  this._oauth2.get(GOOGLE_USER_INFO_ENDPOINT, accessToken, (err, body) => {
    if (err) { return done(err); }

    try {
      //@a Destructure user data from the req body.
      const { sub, name, email } = JSON.parse(body);

      //@a Create the profile
      const profile = {
        id: sub,
        name,
        email
      }

      done(null, profile);
    } catch (parseError) {
      return done(parseError)
    }
  });
};

//@a Define that passport will use the OAuth strategy
passport.use("google-oauth", oAuth2Strategy);
