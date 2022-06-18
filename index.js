var db_uri = "mongodb+srv://jade:D2wyGrmPfBvRqF8@cluster0.8xait.mongodb.net/?retryWrites=true&w=majority"

// index.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var shortid = require('shortid')

// mongoose.connect(process.env.DB_URI)
mongoose.connect(db_uri)

app.use(bodyParser.json())

app.use(bodyParser.urlencoded({extended: false}))

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

app.get("/urlShortener", function (req, res) {
  res.sendFile(__dirname + '/views/urlShortener.html');
});

app.get("/excerciseTracker", function (req, res) {
  res.sendFile(__dirname + '/views/excerciseTracker.html');
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
  res.json({
    "ipaddress": req.ip, 
    "language": req.headers["accept-language"],
    "software": req.headers["user-agent"]
    })
})


// ************** URL Shortener Microservice ***************

const ShortUrl = mongoose.model('ShortUrl', new mongoose.Schema({
  original_url: String,
  short_url: String
})) 

app.post("/api/shorturl/", (req, res) => {
  const url = req.body.url
  const url_prefix = url.substring(0, 4)

  if (url_prefix != "http") {
    res.json({"error": "invalid url"})
  } else {
    const suffix = shortid.generate()

    const newUrl = new ShortUrl({
      original_url: url,
      short_url: suffix
    })

    newUrl.save((err, doc) => {
      if (err) return console.log(err)
    })

    res.json({
      "original_url": newUrl.original_url,
      "short_url": newUrl.short_url
    })
  } 
})

app.get("/api/shorturl/:suffix", (req, res) => {
  const userSuffix = req.params.suffix
  const requestedUrl = ShortUrl.find({short_url: userSuffix}).then((urls) => {
    res.redirect(urls[0].original_url)
  })
})

// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});