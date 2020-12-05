const express = require('express');
const passport = require('passport');
const session = require('express-session');
const boom = require('@hapi/boom');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');

const debug = require('debug')('app:server');

const { config } = require('./config');
const { THIRTY_DAYS_IN_SEC, TWO_HOURS_IN_SEC } = require('./utils/time');

const app = express();

//@o body parser
app.use(express.json());
//@o Cookie parser
app.use(cookieParser());
//@o As Twitter API requires a session. Pass the session library with the sessionSecret
app.use(session({ secret: config.sessionSecret }));
//@o Initialize the session
app.use(passport.initialize());
//@o And return the created session
app.use(passport.session());

app.use(cors());
app.use(helmet());

//@concept Basic Strategy
require('./utils/auth/strategies/basic');

//@concept OAuth Strategy
require('./utils/auth/strategies/oauth');

//@concept Google OpenId Auth Strategy
require('./utils/auth/strategies/google');

//@concept Facebook Auth Strategy
require('./utils/auth/strategies/facebook');

//@concept LinkedIn Auth Strategy
require('./utils/auth/strategies/linkedin');

//@concept Twitter Auth Strategy
require('./utils/auth/strategies/twitter');



app.post('/auth/sign-in', async function (req, res, next) {
  //@a Obtain the rememberMe attribute from the req body
  const { rememberMe } = req.body;

  //@a Generate the req with passport and a basic strategy
  passport.authenticate(
    'basic', (error, data) => {
      try {
        if (error || !data) { next(boom.unauthorized()); }

        req.login(data, { session: false }, async (error) => {
          if (error) { next(error); }

          //@o With the basic strategy we obtain data at login.
          //@a destructure token and user from the data obtained.
          const { token, ...user } = data;

          //@a If there's no error, create a cookie, passing the token.
          //@o Must be httpOnly and secure only on production environment. So we can test and use on dev without problem.
          res.cookie('token', token, {
            httpOnly: !config.dev,
            secure: !config.dev,
            //@o If rememberMe exists, define the age to a month, if not define it to 2 hours
            maxAge: rememberMe ? THIRTY_DAYS_IN_SEC : TWO_HOURS_IN_SEC
          });

          //@a Response with a 200 status and the user.
          res.status(200).json(user);
        });
      } catch (e) {
        next(e);
      }
    }
  )(req, res, next);
});

app.post('/auth/sign-up', async function (req, res, next) {
  const { body: user } = req;

  try {
    await axios({
      url: `${config.apiUrl}/api/auth/sign-in`,
      method: 'post',
      data: user
    });

    res.status(201).json({ message: 'user created' });
  } catch (e) {
    next(e);
  }
});

app.get('/movies', async function (req, res, next) {

});

app.post('/user-movies', async function (req, res, next) {
  try {
    //@a Obtain userMovie from the request body
    const { body: userMovie } = req;
    //@a Obtain the token from the request cookies.
    const { token } = req.cookies;

    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-movies`,
      //@a Add a header of authorization with a bearer token type, passing the token obtained from the cookie.
      headers: { Authorization: `Bearer ${token}` },
      method: 'post',
      data: userMovie
    });

    //@a If the res status it's different to 201, return a bad implementation boom error
    //@o Commonly return an HTTP 500 code. Meaning that something has gone wrong on the website's server, but the server could not be more specific on what the exact problem is.
    if (status !== 201) { return next(boom.badImplementation()); }

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

app.delete('/user-movies/:userMovieId', async function (req, res, next) {
  try {
    //@a Obtain userMovieId from the request params
    const { userMovieId } = req.params;
    const { token } = req.cookies;

    const { data, status } = await axios({
      //@a Add the movie id obtained from the params to the url
      url: `${config.apiUrl}/api/user-movies/${userMovieId}`,
      headers: { Authorization: `Bearer ${token}` },
      method: 'delete'
    });

    if (status !== 200) { return next(boom.badImplementation()); }

    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
});

//@context OAuth End Points
//@a Define the get request where passport will authenticate with the google-oauth strategy
app.get(
  '/auth/google-oauth',
  passport.authenticate(
    'google-oauth',
    {
      //@a Define the scopes of the request
      scope: ['email', 'profile', 'openid']
    }
  )
);

//@a Define the callback request to get the data
app.get(
  '/auth/google-oauth/callback',
  passport.authenticate(
    'google-oauth',
    { session: false }
  ),
  (req, res, next) => {
    //@a Verify if the user exists
    if (!req.user) { next(boom.unauthorized()); }

    //@a Deconstruct the token and user from the req response.
    const { token, ...user } = req.user;

    //@a Create a cookie that contains the access token.
    res.cookie('token', token, {
      httpOnly: !config.dev,
      secure: !config.dev
    });

    //@a Response with a status 200 and the data.
    res.status(200).json(user);
  }
);

//@context Google OpenId Strategy
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['email', 'profile', 'openid']
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res, next) => {
    if (!req.user) {
      next(boom.unauthorized());
    }

    const { token, ...user } = req.user;

    res.cookie('token', token, {
      httpOnly: !config.dev,
      secure: !config.dev
    });

    res.status(200).json(user);
  }
);

//@context Facebook OAuth Strategy
app.get('/auth/facebook', passport.authenticate('facebook', {
  scope: ['email']
})
);

app.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  (req, res, next) => {
    if (!req.user) {
      next(boom.unauthorized());
    }

    const { token, ...user } = req.user;

    res.cookie('token', token, {
      httpOnly: !config.dev,
      secure: !config.dev
    });

    res.status(200).json(user);
  }
);

//@context LinkedIn OAuth Strategy
app.get('/auth/linkedin', passport.authenticate('linkedin', {
  scope: ['r_emailaddress', 'r_liteprofile']
})
);

app.get(
  '/auth/linkedin/callback',
  passport.authenticate('linkedin', { session: false }),
  (req, res, next) => {
    if (!req.user) {
      next(boom.unauthorized());
    }

    const { token, ...user } = req.user;

    res.cookie('token', token, {
      httpOnly: !config.dev,
      secure: !config.dev
    });

    res.status(200).json(user);
  }
);

//@context Twitter OAuth Strategy
app.get('/auth/twitter', passport.authenticate('twitter'));

app.get(
  '/auth/twitter/callback',
  passport.authenticate('twitter', { session: false }),
  (req, res, next) => {
    if (!req.user) {
      next(boom.unauthorized());
    }

    const { token, ...user } = req.user;

    res.cookie('token', token, {
      httpOnly: !config.dev,
      secure: !config.dev
    });

    res.status(200).json(user);
  }
);


//@context Define where the server will listen
app.listen(config.port, function () {
  debug(`Listening http://localhost:${config.port}`);
});

/**
 * @context
 * For testing on postman, define the env variables
 * @a client_url | http://localhost:8000
 * @a user_id | Obtained when sign-in is requested
 * @a user_movie_id
 * ##--
 * @context
 * To test the post user movie route, un body add
 * @a 'userId': '{{user_id}}',
 * @a 'movieId': '{{movie_id}}'
 * ##--
 *
*/