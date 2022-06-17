// index.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + '/views/requestHeaderParser.html');
});

// ************** Timestamp Microservice ***************

app.get("/api/timestamp", (req, res) => {
  res.json({"unix": Date.now(), "utc": new Date(Date.now()).toUTCString()})
})

app.get("/api/timestamp/:date", (req, res) => {
  const dateString = req.params.date
  const isUnix = /^\d+$/.test(dateString);
  let date
  if (isUnix) {
    date = new Date(+dateString)
  } else {
    date = new Date(dateString)
  }
  if (date == "Invalid Date") {
      res.json({"error": "Invalid Date"})
    } else {
      res.json({"unix": isUnix ? +dateString : Date.parse(dateString), "utc": date.toUTCString()})
    }
})

// ************** Request Header Parser Microservice ***************

app.get("/api/whoami", (req, res) => {
  res.json({"message": "hello"})
})

// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
