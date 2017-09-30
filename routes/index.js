const express = require("express"),
    passport = require("passport"),
    User = require("../models/user"),
    Campground = require("../models/campground"),
    async = require("async"),
    nodemailer = require("nodemailer"),
    crypto = require("crypto");

const router = express.Router();

// Landing page (root route)
router.get("/", (req, res) => {
    res.render("landing");
});

// AUTH ROUTES

// show register form
router.get("/register", (req, res) => {
    res.render("register", {
        page: "register"
    });
});

// handle register logic
router.post("/register", (req, res) => {
    let newUser = new User({
        username: req.body.username,
        avatar: req.body.avatar,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email
    });
    const adminCode = process.env.ADMINCODE || "password";
    newUser.isAdmin = req.body.adminCode === adminCode;
    User.register(newUser, req.body.password, (err, user) => {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, () => {
            req.flash("success", "Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds");
        });
    });
});

// show login form
router.get("/login", (req, res) => {
    res.render("login", {
        page: "login"
    });
});

// handle login logic
router.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
}));

// loguout route
router.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "You have been logged out!");
    res.redirect("/campgrounds");
});

// forgot password
router.get("/forgot", (req, res) => {
    res.render("forgot");
});

router.post("/forgot", (req, res, next) => {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, (err, buf) => {
                let token = buf.toString("hex");
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({
                email: req.body.email
            }, (err, user) => {
                if (!user) {
                    req.flash("error", "No account with that email address exists.");
                    return res.redirect("/forgot");
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save((err) => {
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: process.env.GMAILUSER || "gmailuser",
                    pass: process.env.GMAILPASSWORD || "gmailpassword"
                }
            });
            let mailOptions = {
                to: user.email,
                from: process.env.GMAILUSER || "gmailuser",
                subject: "YelpCamp Password Reset",
                text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
                    "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
                    "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                    "If you did not request this, please ignore this email and your password will remain unchanged.\n"
            };
            smtpTransport.sendMail(mailOptions, (err) => {
                req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
                done(err, "done");
            });
        }
    ], function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/forgot");
    });
});

// reset route
router.get("/reset/:token", (req, res) => {
    User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    }, (err, user) => {
        if (!user) {
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot");
        }
        res.render("reset", {
            token: req.params.token
        });
    });
});

router.post("/reset/:token", (req, res) => {
    async.waterfall([
        function (done) {
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: {
                    $gt: Date.now()
                }
            }, (err, user) => {
                if (!user) {
                    req.flash("error", "Password reset token is invalid or has expired.");
                    return res.redirect("back");
                }
                if (req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, (err) => {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save((err) => {
                            req.logIn(user, (err) => {
                                done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect("back");
                }
            });
        },
        function (user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: process.env.GMAILUSER || "gmailuser",
                    pass: process.env.GMAILPASSWORD || "gmailpassword"
                }
            });
            let mailOptions = {
                to: user.email,
                from: process.env.GMAILUSER || "gmailuser",
                subject: "YelpCamp - Your password has been changed",
                text: "Hello,\n\n" +
                    "This is a confirmation that the password for your account " + user.email + " has just been changed.\n\n" +
                    "This is an automatically generated email, please do not reply.\n"
            };
            smtpTransport.sendMail(mailOptions, (err) => {
                req.flash("success", "Success! Your password has been changed.");
                done(err);
            });
        }
    ], function (err) {
        if (err) {
            req.flash("error", err.message);
        }
        res.redirect("/campgrounds");
    });
});


// user profile
router.get("/users/:id", (req, res) => {
    User.findById(req.params.id, (err, foundUser) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            return res.redirect("/campgrounds");
        }
        // check if user is deleted form the database
        if (!foundUser) {
            req.flash("error", "Selected user is deleted");
            return res.redirect("/campgrounds");
        }
        Campground.find().where("author.id").equals(foundUser._id).exec((err, campgrounds) => {
            if (err) {
                req.flash("error", "Error while retrieving information from database");
                return res.redirect("/campgrounds");
            }
            // render show template with user info
            res.render("users/show", {
                user: foundUser,
                campgrounds: campgrounds
            });
        });
    });
});

module.exports = router;