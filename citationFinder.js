var MongoClient = require('mongodb').MongoClient;
var Crawler = require("crawler").Crawler;
var cheerio = require("cheerio");
var ObjectID = require('mongodb').ObjectID;

// Load database
var fixData = function(articles) {
    var removeCount = 0;
    // Query the database and get the article data in a variable
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed:{$exists: false}}, function(err, article) {
        // articles.findOne({authors: "Kopelson, Karen"}, function(err, article) {            
            if(article === null){
                console.log("All done!");
                return;
            }
            article.trimmed = true;
 
            var citations = [];
            var remainingText = article.articleText;
            var citationStart = null;
            var citationEnd = null;
            var capturedText = "";
            var positionOffset = 0;
            var citationType = "";
            var citationCount = 0;
            
            // regexes
            var singleCitationPage = /^\d+$/;
            var singleCitationAuthor = /^[A-Za-z]+$/;
            var singleCitationAuthorPage = /^[A-Za-z]+\s\d+$/;
            var singleCitationBriefTitle = /^\"[^"]*\"$/;
            var singleCitationBriefTitleAuthor = /^\"[^"]*\"\s[A-Za-z]+$/;
            var singleCitationBriefTitlePage  = /^\"[^"]*\"\s\d+$/;
            var singleCitationBriefTitleAuthorPage = /^\"[^"]*\"\s[A-Za-z]+\s\d$/;
            var citationString = /^([^)]*;[^)]*)+$/ 
            var emphasis = /^[^)]*emphasis[^)]*$/    
            
            
            console.log(remainingText);
            do {
                citationStart = remainingText.search(/\([^)]+\)/);
                if (citationStart != -1){
                    ++citationStart; // so as to not include the parenthesis
                    remainingText = remainingText.substr(citationStart);
                    citationEnd = remainingText.search(/\)/); 
                    capturedText = remainingText.substr(0,citationEnd);
                    remainingText = remainingText.substr(citationEnd);
                    positionOffset = positionOffset + citationStart + citationEnd;  
                    if (capturedText.match(singleCitationPage)){
                        citationType = "singleCitationPage";
                        citationCount = 1;
                    } else if (capturedText.match(singleCitationAuthor)) {
                        citationType = "singleCitationAuthor";
                        citationCount = 1;
                    } else if (capturedText.match(singleCitationAuthorPage)) {
                        citationType = "singleCitationAuthorPage";
                        citationCount = 1;
                    } else if (capturedText.match(singleCitationBriefTitle)) {
                        citationType = "singleCitationBriefTitle";
                        citationCount = 1;
                    } else if (capturedText.match(singleCitationBriefTitleAuthor)) {
                        citationType = "singleCitationBriefTitleAuthor";
                        citationCount = 1;
                    } else if (capturedText.match(singleCitationBriefTitleAuthorPage)) {
                        citationType = "singleCitationBriefTitleAuthorPage";
                        citationCount = 1;
                    } else if (capturedText.match(citationString)) {
                        citationType = "citationString";
                        if (capturedText.search(emphasis)){
                            citationCount = capturedText.split(";").length;
                        } else {
                            citationCount = capturedText.split(";").length + 1;
                        }
                    } else {
                        citationType = "noAutomaticClassification";
                        citationCount = 1;
                    }
                    console.log("Pushing: ");
                    console.log("text: " + capturedText);
                    citations.push({text: capturedText, start: citationStart + positionOffset, type: citationType, citationCount: citationCount});                  
                }
            } while (citationStart != -1);
            console.log(citations);
            article.citations = citations;
                        
            articles.update({_id: article._id}, article, {w: 1, upsert: true}, function(err, article) {
                if(err){
                    console.log("Couldn't trim: ", article.URL);
                    console.dir(err);
                    process.kill();
                }
                fixArticle(articles);
            });
        });
    };
    
    articles.update({trimmed: true}, {$unset: {trimmed:''}}, {multi: true}, function(err) {
        if(err){
            console.log("Couldn't untrim.");
            console.dir(err);
            process.kill();   
        }
        console.log("Running articles.update.");
        fixArticle(articles);
        console.log("Calling fixArticle."); 
    });
};

MongoClient.connect("mongodb://localhost:27017/collegeenglish", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles', function(err, articles) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        fixData(articles);
    });
});