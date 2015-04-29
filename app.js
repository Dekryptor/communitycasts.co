var express        = require('express');
var path           = require('path');
var bodyParser     = require('body-parser');
var mysql          = require('mysql');
var validator      = require('express-validator');
var moment         = require('moment');
var youTube        = require('./youTube');

connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'videoHub'
});
connection.connect();

var channels = require('./routes/channels');
var technologies = require('./routes/technologies');
var submit = require('./routes/submit');

var app = express();
var ytClient = new youTube('AIzaSyCKQFYlDRi5BTd1A-9rhFjF8Jb_Hlfnquk');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());

app.use(function(req, res, next) {
  // find all technologies who are associated with approved videos
  var query = 
    'select \
       t.technologyName, \
       count(*) as count \
     from technologies t \
     join technology_video_map m \
       on m.technologyName = t.technologyName \
     where t.technologyName in ( \
       select technologyName \
       from technology_video_map m \
       join videos v \
         on m.videoId = v.videoId \
       where v.approved = 1) \
     group by t.technologyName \
     order by count desc, t.technologyName desc \
     limit 9';
  connection.query(query, function(err, technologies) {
    technologies.push({technologyName:'Other'});
    res.locals.technologies = technologies;
    next();
  });
});
  
app.use('/channels', channels);
app.use('/technologies', technologies);
app.use('/submit', submit);



app.get('/', function (req, res) {
  res.render('index');
});

app.get('/videos/:videoId', function (req ,res) {
  var id = connection.escape(req.params.videoId);
  connection.query('select videoId from videos where videoId = ' + id, function (err, result) {
    var video = result[0];
    if(!video) {
      res.sendStatus(404);
      return;
    }
    res.redirect('https://www.youtube.com/watch?v=' + video.videoId);
    var query = 'select 1 \
      from referrals \
      where videoId = '+ id + ' and refereeIp = ' + connection.escape(req.connection.remoteAddress);
    connection.query(query, function(err, result) {
      var referral = result[0]
      if (!referral) {
        connection.query(
          'update videos \
             set referrals = referrals + 1 \
           where videoId = ' + id);
        connection.query('insert into referrals set ?', { 
          videoId: req.params.videoId, 
          refereeIp: req.connection.remoteAddress
        });
      }
    });
  }); 
});

app.get('/terms', function(req, res) {
  res.render('terms');
});

app.get('/about', function(req, res) {
  res.render('about');
});

app.get('/data/', function(req,res) {

  var model = {};
  connection.query('select count(*) as total from videos; ', function(err, result) {
    model.total = result[0].total;

    var query = 
      'select \
         v.videoId, \
         v.title, \
         c.channelId, \
         c.channelName, \
         v.durationInSeconds, \
         v.submissionDate, \
         GROUP_CONCAT(m.technologyName) as technologies \
      from videos v \
      join channels c \
        on c.channelId = v.channelId \
      join technology_video_map m \
        on m.videoId = v.videoId \
      where v.approved = 1 \
      group by v.videoId \
      limit ' + req.query.offset + ', ' + req.query.limit

    connection.query(query, function (err, result) {
      result.forEach(function(record) {
        record.technologies = record.technologies.split(',');
        record.duration = moment.duration(record.durationInSeconds, 'seconds').humanize();
        delete record.durationInSeconds;
      });
      model.rows = result;
      res.send(model);
    });

  });
});

app.listen(3000);