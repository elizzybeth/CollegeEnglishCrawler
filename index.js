var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/citationCategorizer.html');
});

// this gets called in Mongo createCollection callback
function socketIO(collection) {
    io.on('connection', function(socket){
      console.log('a user connected');
      socket.on('disconnect', function(){
        console.log('user disconnected');
      });
      
      socket.on("get article", function(articleID){
        collection.findOne({_id: new ObjectID(articleID)}, function(err, article){
            io.emit("send article data", article);
        });
      });
      
      socket.on("save article", function(currentArticle) {
        console.log("Got an update!");
        console.log("Confirmed article: ", currentArticle);
        var oldID = currentArticle._id;
        delete currentArticle._id;
        collection.update({_id: new ObjectID(oldID)}, currentArticle, {w: 1}, function(err) {
            if(err) {
                console.log("Couldn't save article.");
                console.log(err);
                return;
            }
        });
      });
      
      collection.find({disabled: false},{URL: 1, title: 1, categorized: 1}).sort({title: 1}).toArray(function(err, articles){
        console.log(err);
        io.emit('update article list', {articles: articles});
        collection.findOne({citationsTagged: null, disabled: false},{"sort": "title"}, function(err, article){
          io.emit("send article data", article);
        });
      });
    });
    
    http.listen(3000, function(){
      console.log('listening on *:3000');
    });
};


MongoClient.connect("mongodb://localhost:27017/ccc", function(err, db) {
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
        collection.ensureIndex("title", function(err){
            if(err) {
                console.log(err);
            }
            socketIO(collection);           
        });
    });
}); 