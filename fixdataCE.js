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
                /ERRATUM/i,
                /Anon: Error/i,
                /Anon: CCCC News/i,
                /Anon: Announcements and Calls/i,
                /Review: /i,
                /review of /i,
                /Comment: /i,
                /Comment &amp; response/i,
                /Comment & response/i,
                /RESPONSE/i
            ];


{ title: { $regex: /^review of/}}

    // Getting article metadata            
            var $ = cheerio.load(article.HTML);
            
            var metadata = "";
            var authors = null;
            metadata += " " + $("p.noprint").text().trim();
            // Set authors
            if(authors === null){                                        
                //children("strong").first());
                
                var authorLineParts = $("p.noprint strong").html().split(": ");
                               
                article.authorString = authorLineParts.shift();
                article.authors = article.authorString.split("; ");
                article.title = authorLineParts.join(": ").trim();
                article.title = article.title.replace("<br>", "");
                article.pubDataParts = $("p.noprint a").text().trim();
                article.volumeIssue = $("p.noprint a").text().trim().match(/\(\d\d:\d\)/);
                article.pubDate = $("p.noprint a").text().trim().match(/\[\w*\s\d\d\d\d\]/);
            
            // Making changes to full text
                // separate Works Cited, count elements
                if($(".References_content p").length){
                    article.worksCited = $(".References_content p").text();
                    article.numOfCitedWorks = $(".References_content p").length;
                    article.worksCitedFill = "Referencescontentp";
                } else if ($('p:contains("WORKS CITED")').length) {
                    article.worksCited = $('p:contains("WORKS CITED")').nextAll().text();
                    article.numOfCitedWorks = $('p:contains("WORKS CITED")').nextAll().length;
                    article.worksCitedFill = "pcontainsWORKSCITED";
                } else if ($('p:contains("Works Cited")').length) {
                    article.worksCited = $('p:contains("Works Cited")').nextAll().text();
                    article.numOfCitedWorks = $('p:contains("Works Cited")').nextAll().length;
                    article.worksCitedFill = "pcontainsWorksCited";
                } else if ($('p:contains("REFERENCES")').length) { 
                    article.worksCited = $('p:contains("REFERENCES")').nextAll().text();
                    article.numOfCitedWorks = $('p:contains("REFERENCES")').nextAll().length;
                    article.worksCitedFill = "pcontainsREFERENCES";
                } else if ($('td:contains("[Reference]")').length) {
                    article.worksCited = $('td:contains("[Reference]")').nextUntil('td:contains("[Author Affiliation]")').
                        addBack().text();
                    article.numOfCitedWorks = $('td:contains("[Reference]")').parent().nextUntil('td:contains("[Author Affiliation]")', 'td').length;
                    article.worksCitedFill = "tdcontainsReference";
                } else {
                    article.worksCited = "";
                    article.worksCitedFill = "none";
                }
                
                // save Abstract
                if($('[name = "abstract"]').length){
                    article.abstract = 
                        $('[name = "abstract"]').nextUntil('[name = "fulltext"]').addBack()
                            .text().trim();
                } else {
                    article.abstract = "";
                }
                
                var articleTextHTML;
                
                if($('[name = "fulltext"]').length) {
                    article.articleText = 
                    $('[name = "fulltext"]').nextUntil('[name = "references"]', ':not(script)').addBack()
                        .text().trim();
                    articleTextHTML = $('[name = "fulltext"]').nextUntil('[name = "references"]', ':not(script)').addBack();
                    article.articleText = articleTextHTML.text().trim();
                    article.numOfParagraphs = articleTextHTML.find("p").length;
                } else if($(".Headnote_content").length) {
                    article.articleText =
                    $(".Headnote_content").parent().parent().nextUntil().text().trim();
                } else if($(".inline.noprint.smallFont").length) {
                    article.articleText = 
                    $(".inline.noprint.smallFont").parent().nextUntil('div:contains("References")').text().trim();
                } else {
                    console.log("Article text couldn't be filled.");
                    console.log("Article title: " + article.title);
                    process.kill();
                }
                
                // Get index of end of "Full Text" + first () + "Copyright National Council of Teachers of English Conference on College Composition and Communication"
                // Set articleText to begin at new index
                
                var stripRegEx = /^Full Text\s\([^)]+\)Copyright National Council of Teachers of English Conference on College Composition and Communication [A-Za-z]{3} \d{4}/;
                article.articleText = article.articleText.replace(stripRegEx, "");
                                
                if(article.articleText == "") {
                    console.log("Article Text is empty.");
                    console.log(article.title);
                    if(($(".inline.noprint.smallFont").parent().nextUntil('div:contains("References")').text().trim()) == "") {
                        console.log("Flagged this empty article for removal. " + article.URL);
                        shouldRemove = true;
                    }
                }
                
            }
            
            if(shouldRemove == false) {
                shouldRemove = badPhrases.some(function(phrase) {
                    return phrase.test(metadata); 
                });
            }
            
            article.disabled = false;
            article.poem = false;
            
            articles.count(
                {
                URL: article.URL,
                _id: {$gt: new ObjectID(article._id.toHexString())}
                    // will ensure we're only pulling one per URL
                },
                function (err, count) {
                    if(err){
                        console.log("Couldn't check for duplicates: ", article.URL);
                        console.dir(err);
                        process.kill();
                    }
                    if (count > 0) {
                        shouldRemove = true;
                        console.log("Found a duplicate! " + article.URL);
                    }
                    if ($('td.textSmall:contains("Document types:")').next('td.textSmall:contains("Poetry")').length) {
                        shouldRemove = true;
                        article.poem = true;
                        console.log("Found a poem! " + article.URL);
                    }
                    if(shouldRemove) {
                        article.disabled = true; // Remember to only look at articles that aren't disabled
                        ++removeCount;
                        console.log("Flagged an article for removal. URL: " + article.URL); 
                        console.log("Current remove count: " + removeCount);
                    } else {
                        article.disabled = false;
                    }            
         
                        
                    articles.update({_id: article._id}, article, {w: 1, upsert: true}, function(err, article) {
                        if(err){
                            console.log("Couldn't trim: ", article.URL);
                            console.dir(err);
                            process.kill();
                        }
                        fixArticle(articles);
                    });
                }
            );
            
            
            
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