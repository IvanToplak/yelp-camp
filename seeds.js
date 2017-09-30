var Campground = require("./models/campground");
var Comment = require("./models/comment");

var data = [{
    name: "Campground 1",
    image: "https://farm8.staticflickr.com/7252/7626464792_3e68c2a6a5.jpg",
    description: "Bacon ipsum dolor amet corned beef meatloaf shank ribeye turducken hamburger pancetta sausage beef ribs. Pork loin pork chop tri-tip, jowl shank turducken leberkas bacon tongue swine rump. Sirloin burgdoggen salami meatball, ground round jerky t-bone pancetta biltong boudin. Fatback spare ribs porchetta ham hock pancetta cupim leberkas strip steak rump ground round burgdoggen. Jowl salami beef, turducken frankfurter fatback boudin."
},
{
    name: "Campground 2",
    image: "https://farm5.staticflickr.com/4137/4812576807_8ba9255f38.jpg",
    description: "Kevin sausage leberkas pastrami shoulder flank brisket. Corned beef pork kielbasa sirloin t-bone. Swine shank pig turkey, biltong beef ribs pastrami sirloin turducken tongue tri-tip sausage ham alcatra doner. Alcatra tail kevin porchetta. Brisket pig tenderloin biltong kevin tongue. Frankfurter sausage brisket venison."
},
{
    name: "Campground 3",
    image: "https://farm4.staticflickr.com/3270/2617191414_c5d8a25a94.jpg",
    description: "Pork chuck ham alcatra fatback. Capicola venison pork chop pork loin porchetta. Flank boudin pork venison meatball landjaeger frankfurter kevin hamburger rump burgdoggen jowl. Chicken doner turducken shoulder frankfurter short ribs porchetta meatloaf alcatra prosciutto beef ribs sirloin capicola. Spare ribs strip steak bacon doner sirloin, biltong beef ribs chuck prosciutto turducken. Venison ham hock turducken, cow beef bacon doner."
}
];

//remove all campgrounds
function seedDB() {
    Campground.remove({}, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("Removed campgrounds!");
        }

        // add new campgrounds
        data.forEach(function (seed) {
            Campground.create(seed, function (err, campground) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("added a campground");
                    //create a comment
                    Comment.create({
                        text: "This is a great place. Very cool!",
                        author: "John Lightgun"
                    },
                    function (err, comment) {
                        if (err) {
                            console.log(err);
                        } else {
                            campground.comments.push(comment);
                            campground.save();
                            console.log("created new comment");
                        }
                    }
                    );
                }
            });
        });
    });
}


module.exports = seedDB;