const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Verify the token 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Check if the user exists in database
function isAuthenticated({email, password}){
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
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


server.post('/auth/login', (req, res) => {
  const {email, password} = req.body
  if (isAuthenticated({email, password}) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({status, message})
    return
  }
const userIndex =  userdb.users.findIndex(user => user.email === email);
    // isExistUser(email);
const name = userdb.users[userIndex].name;
const access_token = createToken({email, name, password});
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

    userdb.users.push(createNewUser(email, password, name));
    json = JSON.stringify(userdb, null, 4);

    fs.writeFile('./users.json', json, (err) => {
        if (err) throw err;
        console.log('User registered');
    });

    const access_token = createToken({email, name, password});
    res.status(200).json({
        success: true,
        access_token: access_token
    });
})

server.get('/api/users', (req, res) => {
        res.status(200).json(userdb.users);
    });

server.use('/api', router);

server.use(/^(?!\/auth).*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({status, message})
    return
  }
  try {
     verifyToken(req.headers.authorization.split(' ')[1])
     next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
})

server.listen(3001, () => {
  console.log('Run Auth API Server')
})