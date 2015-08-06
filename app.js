var Crawler = require("crawler").Crawler; // include Crawler

var MongoClient = require('mongodb').MongoClient; // include Mongo
                     
var setupCrawler = function(collection){
    var c = new Crawler({
        "maxConnections":2,
        
        // Populate this with UofL cookie
        headers: {
            'Cookie': 'optimizelyEndUserId=oeu1397855711890r0.06903332588262856; is_returning=1; oup-cookie=1_29-10-2014; wt3_eid=%3B935649882378213%7C2143446019600667503; AMCV_4D6368F454EC41940A4C98A6%40AdobeOrg=1256414278%7CMCMID%7C29197735351980510733684863018516445160%7CMCAAMLH-1436400486%7C7%7CMCAAMB-1436400486%7CNRX38WO0n5BH8Th-nqAG_A%7CMCAID%7CNONE; optimizelySegments=%7B%22204658328%22%3A%22false%22%2C%22204728159%22%3A%22none%22%2C%22204736122%22%3A%22referral%22%2C%22204775011%22%3A%22gc%22%2C%22700471485%22%3A%22true%22%7D; optimizelyBuckets=%7B%7D; s_lv=1435795835454; __utma=90476039.1627630122.1392921203.1435878556.1437956432.3; __utmz=90476039.1434375083.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); AMCV_774C31DD5342CAF40A490D44%40AdobeOrg=1256414278%7CMCMID%7C29186752574512628033686031665310678970%7CMCAAMLH-1438783857%7C7%7CMCAAMB-1438783857%7CNRX38WO0n5BH8Th-nqAG_A%7CMCAID%7C2A804F518507AECF-6000010A20036FBD; s_fid=2E6A19D1E95E1B6A-055D4F9EFBCAC671; mbox=PC#1438178959041-184916.28_59#1439817486|session#1438607885632-91475#1438609746; _ga=GA1.2.1627630122.1392921203; PQIL=1246; JSESSIONID=A80C84B95E40D8EE68EAC382DA76E552; UID="UNIVERSITY OF LOUISVILLE-KY"; AWSELB=8F41BF69186E7A7E737F7DCEB711ECC28A2C51FB40DFA71E752810FB4E3AD1719ACE39F600987B5BA14F169806D8B425FBF56C6575F29BC9865BF80A0F331AC7E1D3B24EDE; ezproxy=F4ZxDcIu7fpmXLM'
        },
        
        // Called for each crawled page 
        "callback":function(error,result,$) {
            if(error) {
                console.log("Error getting page.");
                console.dir(error);
                return;    
            }
            
            console.log("Inside the callback function.");
            var beginningOfURL = "http://literature.proquest.com.echo.louisville.edu";
              
            // if the URL just crawled is an index page, queue all the articles on it
            var indexTest = /^http:\/\/literature.proquest.com.echo.louisville.edu\/contents/;
            var indexOriginal = "http://literature.proquest.com.echo.louisville.edu/contents/abl_toc/CollegeEnglish/20150701.jsp";
    
            if(indexTest.test(result.request.uri.href)) {
                // on the index page
                console.log("On the index: " + result.request.uri.href);
                    
                // find each article link on the index page
                $("a[href*='searchFullText']").each(function(index,a) {
                    console.log("Checking " + a.href);
                    collection.findOne({URL: a.href}, function(err, article){
                        console.log("The article is: " + article);
                        if(err){
                            console.log("Article exist check failed.");
                            console.log(err);
                        } else if(article === null){
                            // not in the database already
                            // so let's queue it
                            console.log("Queueing " + a.href);
                            c.queue(a.href);
                        } else {
                            console.log("Skipping an article that's already in the database: " + a.href);
                        }
                    });
                });
                if(indexOriginal === result.request.uri.href) {
                    // on the original index page
                    // so queue all the other index pages
                    $(".unstyled .alphalinks > a").each(function() {
                        var currentTOC = $(this).attr("href");
                        console.log("Current TOC: ", currentTOC);
                        c.queue(beginningOfURL + currentTOC);
                    });
                }
            } else {
                console.log("Reached the else!");
                // it's an article
                // so save the article data
                
                // first declare article data
                var articleData = {
                    HTML: $('html').prop('outerHTML'),
                    URL: result.request.uri.href,
                    retDate: new Date,
                    paragraphs: []
                };
                
                // Get all of the paragraphs, excluding author/title line
                $("p").not(".noprint").each(function(index, p) {
                    articleData.paragraphs.push($(p).text().trim());
                });
                
                // Join array elements into a string. 
                articleData.fullText = articleData.paragraphs.join(" ");
                
                // Turn all new lines into spaces (with replace function). 
                articleData.fullText = articleData.fullText.replace(/[\r\n]/," ");
                
                // Turn all double spaces into single spaces (replace).
                articleData.fullText = articleData.fullText.replace(/\s\s+/," ");
                
                // Trim off the final space at end.
                articleData.fullText = articleData.fullText.trim(); 
                
                // Count words with string.split.
                articleData.wordCount = articleData.fullText.split(" ").length;
                
                if(articleData.fullText !== ""){
                    collection.insert(articleData, {w: 1}, function(err, result) {
                        if(err) {
                            console.log("Couldn't save article data.");
                            console.dir(err);
                            process.kill();
                        }        
                    });
                }
            }
 /*           
                // Need to exclude TOC, From the Editor, Reviews from the analysis; will collect them for now
                
                // Will populate author and title in fixdata:
                    //  use indexOf to get the index of the first colon; 
                    //  save in a variable; 
                    //  split the author/title string; 
                    /// don't forget to trim 
                    
                //  Categories to add: author, title, pubDate, citations
                
*/  
                
       
        }
    }); 
    c.queue("http://literature.proquest.com.echo.louisville.edu/contents/abl_toc/CollegeEnglish/20150701.jsp");   
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
        setupCrawler(collection);
           
    });
}); 
                                      