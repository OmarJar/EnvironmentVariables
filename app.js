require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const findOrCreate = require("mongoose-findorcreate")
const FacebookStrategy = require("passport-facebook").Strategy

const app = express()

//const bcrypt = require("bcrypt")
//const saltRounds = 10
//const encrypt = require("mongoose-encryption")
//const md5= require("md5")

app.use(express.static("public"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({ extended: true }))

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/userDB")

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose) // for hashing and salting the passwords in the monogoDB database
userSchema.plugin(findOrCreate)

//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] })

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      })
    })
  })
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user)
    })
  })

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user)
    })
  }
))

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secret"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile)
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user)
    })
  }
))

app.get("/", (req, res) => {
    res.render("home")
})

app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}))

app.get("/auth/facebook",
  passport.authenticate("facebook"))

app.get("/auth/facebook/secret",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets")
  })

  app.get("/auth/google/secret", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/secrets", (req, res)=>{ //to bo sure the the user is logged in so we can redirect him to the secrets page, if not, he will redirected to login page

    User.find({"secret": {$ne: null}}, (err, foundUsers)=>{
      if(err){
        console.log(err)
      }
      else {
        if(foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers})
        }
      }
    })
})

app.get("/submit", (req, res)=>{
  (req.isAuthenticated()) ? res.render("submit") : res.redirect("/login")

})

app.post("/submit", (req, res)=>{
  const submittedSecret = req.body.secret
  console.log(req.user.id)
  User.findById(req.user.id, (err, foundUser) => {
    if(err)
    {
      console.log(err)
    }
    else{
      if(foundUser){
        foundUser.secret = submittedSecret
        foundUser.save(() => {
          res.redirect("/secrets")
        })
      }
    }
  })
})

app.get("/logout", (req, res)=>{
    req.logout((err)=>{
        if(err){
            console.log(err)
        }    
        res.redirect("/")
    })
})


/*app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });*/

app.post("/register", (req, res) => {
   /* bcrypt.hash(req.body.password, saltRounds,(err, hash)=>{

        const newUser = new User({
            email: req.body.username,
            password: hash
        })
    
        newUser.save((err) => {
            (err) ? console.log(err) : res.render("secrets")
        })
    })*/  

    //.register is coming from passport-local-mongoose package
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err)
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, ()=>{ // ()callback func. is only triggered if the auth. was successful and we managed to successfully setup a cookie that saved their current logged in session
                res.redirect("/secrets")

            })
        }
    })
})

app.post("/login", (req, res) => {
  /*  const username = req.body.username
    const password = req.body.password

    User.findOne({ email: username }, (err, foundUser) => {

        if (err) {
            console.log(err)
        }
        else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, (err, result)=>{
                    if(result){
                        res.render("secrets")
                    }
                })
            }
        }

        //(err) ? console.log(err) :
        //(foundUser && foundUser.password === password)?res.render("secrets") : console.log(err);
        
    }) */

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, (err)=>{
        (err) ? console.log(err) :
        passport.authenticate("local")(req, res, ()=>{
            res.redirect("/secrets")})
    })
})




app.listen(3000, () => {
    console.log("Server started on port 3000.");
})