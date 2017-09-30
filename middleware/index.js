const Campground = require("../models/campground");
const Comment = require("../models/comment");

let middlewareObj = {};


// sets currenty logged in user, error and success variables
middlewareObj.setLocalParameters = (req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
};

// check if user is logged in
middlewareObj.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to be logged in. Please log in.");
    res.redirect("/login");
};

// check if logged in user is an author of a campground
middlewareObj.checkCampgroundOwnership = (req, res, next) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash("error", "Sorry, that campground does not exist.");
            res.redirect("back");
        } else if (req.user._id.equals(foundCampground.author.id) || req.user.isAdmin) {
            return next();
        } else {
            req.flash("error", "You don't have permission to do that.");
            res.redirect("back");
        }
    });
};

// check if logged in user is an author of a campground
middlewareObj.checkCommentOwnership = (req, res, next) => {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
        if (err || !foundComment) {
            req.flash("error", "Sorry, that comment does not exist.");
            res.redirect("back");
        } else if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
            return next();
        } else {
            req.flash("error", "You don't have permission to do that.");
            res.redirect("back");
        }
    });
};

module.exports = middlewareObj;