var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('/etc/letsencrypt/live/indxio.info/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/indxio.info/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var express = require("express");
var bodyParser  = require("body-parser");
var md5 = require('md5');
var mysql = require('mysql');
var getJSON = require('get-json');
var app  = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
var port = 80;
//var port = 8001;
var srcs = require('./srcs');
var creds = require('./creds');
var pool  = mysql.createPool({
  host     : creds.host,
  user     : creds.user,
  password : creds.password,
  database : creds.database
});
var runquery = function(query,cb){
  pool.getConnection(function(err, connection) {
    connection.query(query,function(error,results,fields){
      connection.release();
      if(error){cb({'err': error});}else{cb(results,fields);}
    });
  });
};
var dataObject = {
  'srcs': srcs,
  'bases': {},
  'coins': {},
  'pairs': {}
};

var setupDO = function(cb){
  runquery('SELECT DISTINCT `pair` FROM `current`',function(result,fields){
    if(result.err){console.log('you done fucked it: Pair Setup');}else{
      for(var rid in result){
        var pair = result[rid].pair;
        dataObject.pairs[pair] = [];
        var tp = pair.split('_');
        var coin = tp[0],base = tp[1];
        if(dataObject.bases[base]){ dataObject.bases[base].push(coin); }else{ dataObject.bases[base] = [coin]; }
        if(dataObject.coins[coin]){ dataObject.coins[coin].push(base); }else{ dataObject.coins[coin] = [base]; }
      }
      console.log('     Distinct Pair Complete');
      var endcount = Object.keys(dataObject.srcs).length;
      var counter = 0;
      for(var src in srcs){
        runquery('SELECT DISTINCT `pair`,`exchange` FROM `current` WHERE `exchange` = "'+src+'"',function(result,fields){
          if(result.err){console.log('you done fucked it');}else{
            counter++;
            for(var rid in result){
              dataObject.srcs[result[rid].exchange].pairs[result[rid].pair] = {};
              dataObject.pairs[result[rid].pair].push(result[rid].exchange);
            }
            if(counter === endcount){cb(dataObject);}
          }
        });
      }
    }
  });
};
setupDO(function(dataobj){console.log('dataObject Setup Complete');});

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    console.log(Date.now()+'||'+req.path);
    next();
});
app.use('/',express.static('static'));

app.get('/api/stats/:dtype?/:dtarget?',function(req,res){
  if(req.params.dtype && dataObject[req.params.dtype]){var dtype = req.params.dtype; }else{var dtype = 'all';}
  if(req.params.dtarget && dataObject[req.params.dtype][req.params.dtarget]){var dtarget = req.params.dtarget; }else{var dtarget = 'all';}
  if(dtype === 'all'){res.json({'options': Object.keys(dataObject)});}else{
    if(dtarget === 'all'){res.json(dataObject[dtype]);}else{
      res.json(dataObject[dtype][dtarget]);
    }
  }
});

app.get('/api/indx/:pair?',function(req,res){
  var query = 'SELECT `exchange`,`pair`,`value`,`timestamp` FROM `current` WHERE `exchange` = "indx" ';
  if(req.params.pair && Object.keys(dataObject.srcs.indx.pairs).indexOf(req.params.pair) > -1){
    query +='AND `pair` = "'+req.params.pair+'" ORDER BY `timestamp` DESC LIMIT 1';
  }else{
    query += 'ORDER BY `timestamp` DESC LIMIT 8';
  }
  runquery(query,function(result,fields){
    if(result.err){console.log('you done fucked it');}else{
      for(var rid in result){
        var ex = result[rid].exchange;
        var pr = result[rid].pair;
        var vl = result[rid].value;
        var ts = result[rid].timestamp;
        dataObject.srcs[ex].pairs[pr] = [vl,ts];
      }
      if(req.params.pair){res.json(dataObject.srcs.indx.pairs[req.params.pair]);}else{res.json(dataObject.srcs.indx.pairs);}

    }
  });
});

app.get('/api/srcs/:src?/:pair?',function(req,res){
  if(req.params.src && Object.keys(dataObject.srcs).indexOf(req.params.src) > -1){
    var counter = Object.keys(dataObject.srcs[req.params.src].pairs).length;
    var query = 'SELECT `exchange`,`pair`,`value`,`timestamp` FROM `current` WHERE `exchange` = "'+req.params.src+'"';
    if(req.params.pair && Object.keys(dataObject.srcs[req.params.src].pairs).indexOf(req.params.pair) > -1){
      query += ' AND `pair` = "'+req.params.pair+'" ORDER BY `timestamp` DESC LIMIT 1';
    }else{
      query += ' ORDER BY `timestamp` DESC LIMIT '+counter;
    }
    runquery(query,function(result,fields){
      for(var rid in result){
        dataObject.srcs[result[rid].exchange].pairs[result[rid].pair] = [result[rid].value,result[rid].timestamp];
      }
      if(req.params.pair && Object.keys(dataObject.srcs[req.params.src].pairs).indexOf(req.params.pair) > -1){
        res.json(dataObject.srcs[req.params.src].pairs[req.params.pair]);
      }else{
        res.json(dataObject.srcs[req.params.src].pairs);
      }
    });
  }else{res.json(Object.keys(dataObject.srcs));}

});

app.get('/api',function(req,res){
  res.json({'options': ['stats','indx','srcs']});
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

// app.listen(port,function(){
//   console.log("indxio API server running on Port "+port);
// });
