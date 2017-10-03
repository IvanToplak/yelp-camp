const express = require("express"),
    Campground = require("../models/campground"),
    Comment = require("../models/comment"),
    router = express.Router(),
    middleware = require("../middleware"),
    geocoder = require("geocoder");

// local variables
let perPage = 8;
let page = 1;
let value = -1;
let output = {
    data: null,
    pages: {
        current: page,
        prev: 0,
        hasPrev: false,
        next: 0,
        hasNext: false,
        total: 0
    },
    items: {
        begin: ((page * perPage) - perPage) + 1,
        end: page * perPage,
        total: 0
    }
};

// INDEX - show all campgrounds
router.get("/", (req, res) => {
    init(req);
    if (req.query && req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), "gi");
        Campground
            .find().where("name").equals(regex)
            .skip((page - 1) * perPage)
            .limit(perPage)
            .sort({
                "createdAt": value
            }).exec((err, campgrounds) => {
                if (err) {
                    req.flash("error", "Error while retrieving information from database");
                    res.redirect("/campgrounds");
                } else if (campgrounds.length === 0) {
                    req.flash("error", "No campgrounds match that query, please try again");
                    res.redirect("/campgrounds");
                } else {
                    Campground.count().where("name").equals(regex)
                        .exec((err, count) => {
                            if (err) {
                                req.flash("error", "Error while retrieving information from database");
                                res.redirect("/campgrounds");
                            }
                            setOutput(campgrounds, count);
                            res.render("campgrounds/index", {
                                campgrounds: output.data,
                                pages: output.pages,
                                items: output.items,
                                page: "campgrounds"
                            });
                        });
                }
            });
    } else {
        // get all campgrounds form DB
        Campground
            .find()
            .skip((page - 1) * perPage)
            .limit(perPage)
            .sort({
                "createdAt": value
            }).exec((err, campgrounds) => {
                if (err) {
                    req.flash("error", "Error while retrieving information from database");
                    res.redirect("/campgrounds");
                }
                Campground.count().exec((err, count) => {
                    if (err) {
                        req.flash("error", "Error while retrieving information from database");
                        res.redirect("/campgrounds");
                    }
                    setOutput(campgrounds, count);
                    res.render("campgrounds/index", {
                        campgrounds: output.data,
                        pages: output.pages,
                        items: output.items,
                        page: "campgrounds"
                    });
                });
            });
    }
});

// CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, (req, res) => {
    // get data form form and add to campgrounds array
    let name = req.body.name;
    let image = req.body.image;
    let description = req.sanitize(req.body.description);
    let price = req.body.price;
    let author = {
        id: req.user._id,
        username: req.user.username
    };

    // geocoding
    geocoder.geocode(req.body.location, (err, data) => {
        let lat, lng, location;
        if (data && data.results[0] && data.results[0].geometry && data.results[0].geometry.location) {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
            location = data.results[0].formatted_address;
        } else {
            lat = 0;
            lng = 0;
            location = req.body.location;
        }

        let newCampground = {
            name: name,
            image: image,
            description: description,
            author: author,
            price: price,
            location: location,
            lat: lat,
            lng: lng
        };
        // save new campground to DB
        Campground.create(newCampground, (err) => {
            if (err) {
                req.flash("error", "Error while saving information to database");
                res.redirect("/campgrounds");
            }
            //redirect back to campgrounds page
            req.flash("success", "Campground added successfully.");
            res.redirect("/campgrounds");
        });
    });
});

// NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:id", (req, res) => {
    // get campground form DB
    Campground.findById(req.params.id).populate("comments").exec((err, foundCampground) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("/campgrounds");
        }

        // calculate campground rating
        let numberOfCampgroundVotes = 0;
        let sumOfRatings = 0;
        let campgroundRating = 0;

        if (foundCampground.rating) {
            numberOfCampgroundVotes = foundCampground.rating.length;
        }
        if (numberOfCampgroundVotes) {
            sumOfRatings = foundCampground.rating.reduce((acc, cur) => acc + cur.value, 0);
            campgroundRating = sumOfRatings / numberOfCampgroundVotes;
        }

        // check if current user can vote (hasn't voted yet)
        let currentUserCanVote = false;
        if (req.user) {
            currentUserCanVote = true;
            if (numberOfCampgroundVotes) {
                currentUserCanVote = !foundCampground.rating.some((el) => {
                    return req.user._id.equals(el.id);
                });
            }
        }

        // render show template with campground info
        res.render("campgrounds/show", {
            campground: foundCampground,
            currentUserCanVote: currentUserCanVote,
            campgroundRating: campgroundRating,
            numberOfCampgroundVotes: numberOfCampgroundVotes
        });
    });
});

// EDIT
router.get("/:id/edit", middleware.isLoggedIn, middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("/campgrounds");
        }
        // render show template with campground info
        res.render("campgrounds/edit", {
            campground: foundCampground
        });

    });
});

// UPDATE
router.put("/:id", middleware.isLoggedIn, middleware.checkCampgroundOwnership, (req, res) => {
    // geocode
    geocoder.geocode(req.body.campground.location, (err, data) => {
        let lat, lng, location;
        if (data && data.results[0] && data.results[0].geometry && data.results[0].geometry.location) {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
            location = data.results[0].formatted_address;
        } else {
            lat = 0;
            lng = 0;
            location = req.body.location;
        }

        let newData = {
            name: req.body.campground.name,
            image: req.body.campground.image,
            description: req.sanitize(req.body.campground.description),
            price: req.body.campground.price,
            location: location,
            lat: lat,
            lng: lng
        };

        // find and update a campground
        Campground.findByIdAndUpdate(req.params.id, newData, (err) => {
            if (err) {
                // console.log(err);
                req.flash("error", "Error while updating information in database");
                res.redirect("/campgrounds");
            }
            // redirect to show page
            req.flash("success", "Campground updated successfully.");
            res.redirect("/campgrounds/" + req.params.id);
        });
    });
});

// DESTROY (DELETE)
router.delete("/:id", middleware.isLoggedIn, middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findByIdAndRemove(req.params.id, (err, deletedCampground) => {
        if (err) {
            req.flash("error", "Error while deleting information from database");
            res.redirect("/campgrounds");
        }
        // delete related comments to avoid having orphans
        Comment.deleteMany({
            _id: {
                $in: deletedCampground.comments
            }
        }, (err) => {
            if (err) {
                req.flash("error", "Error while deleting information from database");
                res.redirect("/campgrounds");
            }
        });
        req.flash("success", "Campground deleted successfully.");
        res.redirect("/campgrounds");
    });
});

router.post("/:id/vote", middleware.isLoggedIn, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err) {
            req.flash("error", "Error while retrieving information from database");
            res.redirect("/campgrounds");
        }
        // add new rating
        foundCampground.rating.push({
            id: req.user._id,
            value: req.body.rating
        });
        foundCampground.save();
        // redirect to campground show page
        req.flash("success", "Thank you for your vote!");
        res.redirect("/campgrounds/" + foundCampground._id);
    });
});

// escape the regular expression special characters
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// pagination helper functions
function init(req) {
    if (req.query && req.query.perPage) {
        perPage = parseInt(req.query.perPage, 10);
    }
    if (req.query && req.query.page) {
        page = parseInt(req.query.page, 10);
    }
    if (req.query && req.query.value) {
        value = parseInt(req.query.value, 10);
    }
}

function setOutput(campgrounds, count) {
    output.items.total = count;
    output.data = campgrounds;
    output.pages.total = Math.ceil(output.items.total / perPage);
    output.pages.current = page;
    if (output.pages.current < output.pages.total) {
        output.pages.next = Number(output.pages.current) + 1;
    } else {
        output.pages.next = 0;
    }
    output.pages.hasNext = (output.pages.next !== 0);
    output.pages.prev = output.pages.current - 1;
    output.pages.hasPrev = (output.pages.prev !== 0);
    if (output.items.end > output.items.total) {
        output.items.end = output.items.total;
    }
}

module.exports = router;