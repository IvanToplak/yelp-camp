const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    flash = require("connect-flash"),
    User = require("./models/user"),
    //seedDB = require("./seeds"),
    middleware = require("./middleware");

// requring routes
const campgroundRoutes = require("./routes/campgrounds"),
    commentRoutes = require("./routes/comments"),
    authRoutes = require("./routes/index");

mongoose.Promise = global.Promise;

// environment variables
const databaseUrl = process.env.DATABASEURL || "mongodb://localhost/yelp_camp",
    port = process.env.PORT || "3000",
    hostname = process.env.IP || "127.0.0.1";

// connect to database
mongoose.connect(databaseUrl, {
    useMongoClient: true
});

app.use(bodyParser.urlencoded({
    extended: true
}));

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); //seed the database
app.locals.moment = require("moment");

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.SESSION || "secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// set local parameters (currenty logged in user for every route, success and error variables, ...)
app.use(middleware.setLocalParameters);

// linking to routes
app.use(authRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

// start server
app.listen(port, hostname, () => {
    console.log("Yelp Camp Server has started");
});