// index.js
// where your node app starts

// init project
require("dotenv").config()
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var shortid = require('shortid')

mongoose.connect(process.env.DB_URI)

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

app.get("/request-header-parser", function (req, res) {
  res.sendFile(__dirname + '/views/request-header-parser.html');
});

app.get("/url-shortener", function (req, res) {
  res.sendFile(__dirname + '/views/url-shortener.html');
});

app.get("/exercise-tracker", function (req, res) {
  res.sendFile(__dirname + '/views/exercise-tracker.html');
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

// ************** Exercise Tracker ***************

const ExerciseUser = mongoose.model('ExerciseUser', new mongoose.Schema({
  _id: String,
  username: {type: String, unique: true}
}))

const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  userId: {type: String, required: true},
  description: String,
  duration: Number,
  date: Date
}))

app.post("/api/users", (req, res) => {
  const newUser = new ExerciseUser({
    _id: mongoose.Types.ObjectId(),
    username: req.body.username
  })

  newUser.save((err, docs) => {
    if (err) {
      err.code == 11000 ? res.json({"error": "username already exists"}) : res.json(err)
      return console.log(err)
    } 
    res.json({
      "username": newUser.username,
      "_id": newUser._id
    })
  })
})

app.post("/api/users/:id/exercises", (req, res) => {
  const id = req.params.id
  const {description, duration, date} = req.body

  ExerciseUser.findById(id, (err, userData) => {
    if(err || !userData) {
      res.send("Could not find user")
    } else {
      const newExercise = new Exercise({
        userId: id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })

      newExercise.save((err, data) => {
        if (err || !data) {
          res.send("There was an error saving this exercise")
          console.log(err)
        } else {
          const {description, duration, date} = data
          res.json({
            username: userData.username,
            description,
            duration,
            date: date.toDateString(),
            _id: userData.id
          })
        }
      })
    }
  })
})

app.get("/api/users", async (req, res) => {
  const users = await ExerciseUser.find()
  res.json(users)
})

app.get("/api/users/:id/logs", (req, res) => {
  const { id } = req.params
  const { from, to, limit } = req.query
  let username, userId, count, log
  ExerciseUser.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Could not find user")
      console.log(err)
    } else {
      username = userData.username
      userId = userData.id

      const dateObj = {}

      if (from) {
        dateObj["$gte"] = new Date(from)
      }
      if (to) {
        dateObj["$lte"] = new Date(to)
      }

      let filter = {
        userId
      }

      if (from || to) {
        filter.date = dateObj
      }

      const nonNullLimit = limit ?? 500

      Exercise.find(filter).limit(+nonNullLimit).exec((err, exerciseData) => {
        if (err) {
          res.send(`There was an error retrieving the exercise data for ${username}` )
        } else if (!exerciseData) {
          res.json({
            username,
            count: 0,
            id,
            log: []
          })
        } else {
          res.json({
            username,
            count: exerciseData.length,
            id,
            log: exerciseData.map(exercise => {
              const {description, duration, date} = exercise
              return {
                description,
                duration,
                date: date.toDateString()
              }
            })
          })
        }
      })
    }
  })
})

// ************** File Metadata Microservice ***************

// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});