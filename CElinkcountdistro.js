var MongoClient = require('mongodb').MongoClient; // include Mongo
var plotlykey = require('./plotly_api_key.js').key;
var plotly = require('plotly')("elizzybeth", plotlykey);

var getLinkCounts = function(collection){
    collection.find({"disabled": false}).toArray(function(err, results) {
        // loop through citations
            // for each citation, add citation count to a variable
            // object where key is citation count and value is the number of documents
        
        
/*
            var linkCountBucket = bucketSize*Math.ceil(article.linkCount/bucketSize);
            if (undefined === sharesByLinkCount[linkCountBucket]) {
                sharesByLinkCount[linkCountBucket] = [];
            }
            sharesByLinkCount[linkCountBucket].push(article.FBdata.total_count);
*/
        
        citationCountArray = {};
        var citeCounter = 0;
        
        results.forEach(function(article){
            for(var citeIterator = 0; citeIterator < article.citations.length; citeIterator++){
                citeCounter += article.citations[citeIterator].citationCount;
            }
            if (undefined === citationCountArray[citeCounter]){
                citationCountArray[citeCounter] = [];
            }
            ++citationCountArray[citeCounter];
            citeCounter = 0;
        });
        console.log(citationCountArray);
        
        var data = [];
        for(var i in citationCountArray){
            barColor = "'rgba(158,202,225,-0.8)'"
            data.push({
                x: i,
                y: citationCountArray[i],
                text: citationCountArray[i],
                type: 'bar',
                marker: {
                    color: barColor,
                    opacity: 0.6
                },
                showlegend: false,
                showarrow: false
            });    
        }
        var graphOptions = {filename: "CE-citation-count-distro", fileopt: "overwrite", layout: {
                title: "College English: Number of Articles by Citation Count",
                xaxis: {
                    title: "Citation Count",
                    autotick: false
                },
                yaxis: {
                    title: "Number of Articles",
                }
            }
        };
        plotly.plot(data, graphOptions, function (err, msg) {
            console.log(msg);
        }); 
    });  
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
        getLinkCounts(collection);
           
    });
}); 