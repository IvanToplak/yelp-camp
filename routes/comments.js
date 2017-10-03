const express = require("express"),
    Campground = require("../models/campground"),
    Comment = require("../models/comment"),
    router = express.Router({
        mergeParams: true
    }),
    middleware = require("../middleware");

// NEW - show form to create new comment
router.get("/new", middleware.isLoggedIn, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("back");
        }
        res.render("comments/new", {
            campground: campground
        });
    });
});

// CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, (req, res) => {
    // look up campground using id
    Campground.findById(req.params.id, (err, campground) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("/campgrounds");
        }
        // create new comment
        req.body.comment.text = req.sanitize(req.body.comment.text);
        Comment.create(req.body.comment, (err, comment) => {
            if (err) {
                req.flash("error", "Error while saving information to database");
            } else {
                // add username and user id to comment
                comment.author.id = req.user._id;
                comment.author.username = req.user.username;
                comment.save();
                // connect new comment to campground
                campground.comments.push(comment);
                campground.save();
                // redirect to campground show page
                req.flash("success", "Comment added successfully.");
                res.redirect("/campgrounds/" + campground._id);
            }
        });
    });
});

// EDIT - change existing comment
router.get("/:comment_id/edit", middleware.isLoggedIn, middleware.checkCommentOwnership, (req, res) => {
    // look up comment using comment_id    
    Comment.findById(req.params.comment_id, (err, foundComment) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("back");
        }
        // render show template with campground ID and comment info
        res.render("comments/edit", {
            campground_id: req.params.id,
            comment: foundComment
        });
    });
});

// UPDATE
router.put("/:comment_id", middleware.isLoggedIn, middleware.checkCommentOwnership, (req, res) => {
    req.body.comment.text = req.sanitize(req.body.comment.text);
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err) => {
        if (err) {
            req.flash("error", "Error while updating information in database");
            res.redirect("back");
        }
        //redirect to show page
        req.flash("success", "Comment updated successfully.");
        res.redirect("/campgrounds/" + req.params.id);
    });
});

// DESTROY (DELETE)
router.delete("/:comment_id", middleware.isLoggedIn, middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndRemove(req.params.comment_id, (err) => {
        if (err) {
            req.flash("error", "Error while deleting information from database");
            res.redirect("back");
        }
        //redirect to show page
        req.flash("success", "Comment deleted successfully.");
        res.redirect("/campgrounds/" + req.params.id);
    });
});

module.exports = router;