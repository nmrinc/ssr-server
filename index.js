const express = require("express");
const passport = require('passport');
const boom = require('@hapi/boom');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');

const { config } = require("./config");

const app = express();

//@o body parser
app.use(express.json());
//@o Cookie parser
app.use(cookieParser());

app.use(cors());
app.use(helmet());

//@concept Basic Strategy
require('./utils/auth/strategies/basic');

app.post("/auth/sign-in", async function (req, res, next) {
  //@a Generate the req with passport and a basic strategy
  passport.authenticate(
    'basic', (error, data) => {
      try {
        if (error || !data) { next(boom.unauthorized()); }

        req.login(data, { session: false }, async (error) => {
          if (error) { next(error); }

          //@a If there's no error, create a cookie, passing the token.
          //@o Must be httpOnly and secure only on production environment. So we can test and use on dev without problem.
          res.cookie('token', token, {
            httpOnly: !config.dev,
            secure: !config.dev
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

app.post("/auth/sign-up", async function (req, res, next) {
  const { bode: user } = req;

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

app.get("/movies", async function (req, res, next) {

});

app.post("/user-movies", async function (req, res, next) {

});

app.delete("/user-movies/:userMovieId", async function (req, res, next) {

});

app.listen(config.port, function () {
  console.log(`Listening http://localhost:${config.port}`);
});
