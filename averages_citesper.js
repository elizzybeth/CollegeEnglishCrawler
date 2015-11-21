var MongoClient = require('mongodb').MongoClient; // include Mongo
var plotlykey = require('./plotly_api_key.js').key;
var plotly = require('plotly')("elizzybeth", plotlykey);

var getAverages = function(collection){
    collection.find({ "disabled" : false });



/*    var linkCountShareCount;
    collection.find({},{_id: 0, linkCount:1, "FBdata.total_count":1}).toArray(function(err, results){        
        sharesByLinkCount = [];
        linkCounts = [];
        var i = 0;
        
        results.forEach(function(article){

            if(article.linkCount < 1) {
                return;
            }

            var linkCount = article.linkCount;
            if (undefined === sharesByLinkCount[i]) {
                sharesByLinkCount[i] = [];
                linkCounts[i] = [];
            }
            sharesByLinkCount[i].push(article.FBdata.total_count);
            linkCounts[i].push(article.linkCount);
            ++i;
        });
        
        console.log("Link Counts: " + linkCounts); 
        console.log("Shares: " + sharesByLinkCount);
    });
*/    

};


MongoClient.connect("mongodb://localhost:27017/collegeenglish", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles', function(err, collection) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        getAverages(collection);
           
    });
}); 