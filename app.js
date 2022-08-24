require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

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
    password: String
})

userSchema.plugin(passportLocalMongoose) // for hashing and salting the passwords in the monogoDB database

//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] })

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.get("/", (req, res) => {
    res.render("home")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/secrets", (req, res)=>{ //to bo sure the the user is logged in so we can redirect him to the secrets page, if not, he will redirected to login page

    (req.isAuthenticated()) ? res.render("secrets") : res.redirect("/login")
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