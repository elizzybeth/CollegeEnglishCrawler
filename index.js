var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;

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
      
    collection.find({disabled: false},{URL: 1, title: 1, categorized: 1}).toArray(function(err, articles){
        io.emit('update article list', {articles: articles});
    });
    
    
    
/*
      socket.on('chat message', function(msg){
        io.emit('chat message', msg);
        console.log('message: ' + msg);
      });
*/
    });
    
    http.listen(3000, function(){
      console.log('listening on *:3000');
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
        socketIO(collection);           
    });
}); 