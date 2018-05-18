const fs = require('fs');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const express = require('express');
const routerReview = express.Router();

const server = jsonServer.create();
const router = jsonServer.router('./database.json');
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));
const reviewsdb = JSON.parse(fs.readFileSync('./reviews.json', 'UTF-8'));


server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789';

const expiresIn = '1h';

// Create a token from a payload 
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn});
}

// Verify the token 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err);
}

// Check if the user exists in database
function isAuthenticated({email, password}){
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1;
}

function isExistUser(email) {
    return userdb.users.findIndex(user => user.email === email) !== -1;
}

function createNewUser(email, password, name) {
    let maxIndex = 0;
    userdb.users.forEach(user => {
        if (maxIndex < user.id) maxIndex = user.id;
    });

    return {
        id: maxIndex + 1,
        email,
        name,
        password
    }
}

function createReview(rate,
                      text,
                      id_user,
                      id_entry) {
    let maxIndex = 0;
    reviewsdb.reviews.forEach(review => {
        if (maxIndex < review.id) maxIndex = review.id;
});

    return {
        id: maxIndex + 1,
        rate,
        text,
        id_user,
        id_entry
    }
}

function badRequest(res) {
    const status = 400;
    const message = 'Bad request';
    res.status(status).json({
        message
    });
}

function isDigit(c) {
    if ('0123456789'.indexOf(c) !== -1) {
        return false;
    }
    return true;
}


server.post('/auth/login', (req, res) => {
  const {email, password} = req.body
  if (isAuthenticated({email, password}) === false) {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({status, message});
    return;
  }
const userIndex =  userdb.users.findIndex(user => user.email === email);
const name = userdb.users[userIndex].name;
const id = userdb.users[userIndex].id;
const access_token = createToken({id, email, name, password});
  res.status(200).json({
      success: true,
      access_token: access_token
  });
})


server.post('/auth/registration', (req, res) => {
    const {email, password, name} = req.body;

    if (isExistUser(email, name)) {
        const status = 400;
        const message = 'User already exist';
        res.status(status).json({
            success: false,
            message
        });
        return;
    };
    let newUser = createNewUser(email, password, name);
    const id = newUser.id;
    userdb.users.push(newUser);
    json = JSON.stringify(userdb, null, 4);

    fs.writeFile('./users.json', json, (err) => {
        if (err) throw err;
        console.log('User registered');
    });

    const access_token = createToken({id, email, name, password});
    res.status(200).json({
        success: true,
        access_token: access_token
    });
})

server.use('/api', router);

server.use(/^(?!\/auth).*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401;
    const message = 'Error in authorization format';
    res.status(status).json({status, message});
    return
  }
  try {
     verifyToken(req.headers.authorization.split(' ')[1]);
     next();
  } catch (err) {
    const status = 401;
    const message = 'Error access_token is revoked';
    res.status(status).json({status, message});
  }
});

routerReview.post("/reviews", function(req, res) {
    const {
        rate,
        text,
        id_user,
        id_entry} = req.body;

    reviewsdb.reviews.push(createReview(rate, text, id_user, id_entry));
    json = JSON.stringify(reviewsdb, null, 4);

    fs.writeFile('./reviews.json', json, (err) => {
        if (err) throw err;
    console.log('Reviews added');
});

    res.send(reviewsdb.reviews[reviewsdb.reviews.length - 1]);
});

routerReview.get("/reviews/:id", function(req, res) {
    if (isDigit(req.params.id)) {
        badRequest(res);
        return;
    }
    const reviews = [];
    for (let i=0; i < reviewsdb.reviews.length; i++) {
        if (reviewsdb.reviews[i].id_entry == req.params.id) {
            reviews.push(reviewsdb.reviews[i]);
        }
    }

    res.send(reviews);
});

server.use('/protected', routerReview);



server.listen(3001, () => {
  console.log('Run Auth API Server')
})