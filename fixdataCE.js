var MongoClient = require('mongodb').MongoClient;
var Crawler = require("crawler").Crawler;
var cheerio = require("cheerio");

// Load database
var fixData = function(articles) {
    var removeCount = 0;
    // Query the database and get the article data in a variable
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed:{$exists: false}}, function(err, article) {
            if(article === null){
                console.log("All done!");
                return;
            }
            
            article.trimmed = true;
 
 // Disabling (flagging) useless articles            
            var shouldRemove = false;
            var badPhrases = [
                /From the Editor/i, 
                /Anon: Erratum/i,
                /Anon: Error/i,
                /Anon: CCCC News/i,
                /Anon: Announcements and Calls/i,
                /Review: /i
            ];
            
            var $ = cheerio.load(article.HTML);
            
            var metadata = "";
            $("p.noprint").each(function(index, p){
                metadata += " " + $(p).text().trim();
            });
            
            shouldRemove = badPhrases.some(function(phrase) {
                return phrase.test(metadata); 
            })
            
            if(shouldRemove) {
                article.disabled = true; // Remember to only look at articles that aren't disabled
                ++removeCount;
                console.log("Flagged an article for removal. URL: " + article.URL); 
                console.log("Current remove count: " + removeCount);
/*              
                articles.remove({_id: article._id}, function(err){
                    if(err){
                        console.log("Couldn't remove.");
                        console.dir(err);
                        process.kill();
                    }
                });
*/
            } else {
                article.disabled = false;
            }
 
 
 
 
                
            articles.update({_id: article._id}, article, {w: 1}, function(err, article) {
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
        fixArticle(articles); 
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