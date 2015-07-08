var express         = require('express');
var path            = require('path');
var bodyParser      = require('body-parser');
var mysql           = require('mysql');
var validator       = require('express-validator');
var moment          = require('moment');
var promise         = require('bluebird');
var session         = require('express-session');
var flash           = require('express-flash');
var sitemap         = require('sitemap');

var screencasts     = require('./routes/screencasts');
var screencastsApi  = require('./routes/screencastsApi');

var app = express();

promise.promisifyAll(require('mysql/lib/Connection').prototype);

connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'communityCasts'
});
connection.connect();

// settings
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// middlware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'hello 123',
  resave: true,
  saveUninitialized: true
}));
app.use(flash());
app.use(validator({
  errorFormatter: function(param, msg) {
    return msg;
  },
  customValidators: {
    hasLessThan3Tags: function(value) {
      var tags = value.split(',');
      tags = tags.filter(function(tag) { return /\S/.test(tag) });
      tags = tags.filter(function(item, pos, self) { return self.indexOf(item) == pos; });
      return tags.length < 3;
    },
    doesNotContainTagOther: function(value) {
      var tags = value.split(',');
      tags = tags.map(function(tag) { return tag.toLowerCase(); });
      var found = tags.some(function(tag) { return tag.indexOf('other') != -1; });
      return !found;
    }
  }
}));
app.use(function(req, res, next) {
  if(req.url.indexOf('/api/') === 0) {
    next();
    return;
  }

  var query =
  'SELECT \
     t.tagName, \
     COUNT(*) AS count \
   FROM tags t \
   JOIN screencastTags st \
     ON st.tagName = t.tagName \
   JOIN screencasts s \
     ON s.screencastId = st.screencastId \
   WHERE s.status = \'approved\' \
   GROUP BY t.tagName \
   ORDER BY count DESC, t.creationDate \
   LIMIT 10';
  connection.queryAsync(query).spread(function(tags) {
    if (tags.length === 10) {
      tags.pop();
      tags.push({
        tagName:'Other'
      });
    }
    tags = tags.map(function (tag) {
      if (tag.tagName.length >= 9) {
        tag.tagName = tag.tagName.substring(0, 9) + '...';
      }
      return tag;
    });
    res.locals.tags = tags;
    next();
  });
});

var map = sitemap.createSitemap ({
  hostname: 'http://communitycasts.co/',
  cacheTime: 600000,
  urls: [
    { url: 'about',  changefreq: 'monthly',  priority: 0.5 },
    { url: 'submit',  changefreq: 'monthly',  priority: 0.5 },
  ]
});

var query =
  'SELECT \
     t.tagName \
   FROM tags t \
   JOIN screencastTags st \
     ON st.tagName = t.tagName \
   JOIN screencasts s \
     ON s.screencastId = st.screencastId \
   WHERE s.status = \'approved\'';
connection.queryAsync(query).spread(function(tags) {
  tags.forEach(function(tag) {
    map.add({ url: 'screencasts/tagged/' + tag.tagName,  changefreq: 'daily',  priority: 0.5 });
  });
});
app.get('/sitemap.xml', function(req, res) {
  map.toXML( function (xml) {
    res.header('Content-Type', 'application/xml');
    res.send( xml );
  });
});

// routes
app.use('/screencasts', screencasts);
app.use('/api/screencasts', screencastsApi);
app.get('/', function (req, res) {
  res.render('home');
});
app.get('/about', function (req, res) {
  res.render('about');
});
app.get('/api/tags', function(req, res) {
  var term = req.query.term;
  var query =
  'SELECT \
     t.tagName \
   FROM tags t \
   JOIN screencastTags st \
     ON st.tagName = t.tagName \
   JOIN screencasts s \
     ON s.screencastId = st.screencastId \
   WHERE s.status = \'approved\' AND t.tagName LIKE ? \
   GROUP BY t.tagName \
   LIMIT 5';
  connection.queryAsync(query, '%' + term + '%').spread(function(tags) {
    tags = tags.map(function(tag) { return tag.tagName });
    res.send(tags);
  })
})
app.use(function(req, res, next) {
  res.status(404).render('404');
});




app.listen(process.env.PORT || '3000');
