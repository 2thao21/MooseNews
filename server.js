var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/moooseNews", { useNewUrlParser: true });

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mooseNews";

mongoose.connect(MONGODB_URI);


// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.nypost.com/sports/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h3 within an article tag, and do the following:
    $("article h3").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      // result.summary = $(this)
      //   .children("a")
      //   .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    // res.send("Scrape Complete");
    res.redirect("/");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  
  db.Article.find({}) 
    .then( articles => res.json(articles))
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {

  db.Article.findOne({_id: req.params.id}) 
    .populate("note")
    .then( article => res.json(article))
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
 
  db.Note.create(req.body)
  // then find an article from the req.params.id
    .then( dbNote => db.Article.findOneAndUpdate(
            {_id:req.params.id},
            {$set:{note:dbNote._id}})    
    )
    .then(dbArticle => res.json(dbArticle))
    .catch( err => res.json(500, err))
  // and update it's "note" property with the _id of the new note

});


// Still need to create a saved articles section
// Need to make it so same articles don't get scraped. 
// Also need to create summaries.


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
