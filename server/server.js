
var loopback = require('loopback');
var boot = require('loopback-boot');
var express = require('express');
var xmlparser = require('express-xml-bodyparser');

var app = module.exports = loopback();
app.use(xmlparser());

// app.use(utils.sign(config));
app.DisableSystemMethod = function(_basemodel) {
    _basemodel.disableRemoteMethodByName("create", true);
    _basemodel.disableRemoteMethodByName("upsert", true);
    _basemodel.disableRemoteMethodByName("updateAll", true);
    _basemodel.disableRemoteMethodByName("updateAttributes", false);

    _basemodel.disableRemoteMethodByName("find", true);
    _basemodel.disableRemoteMethodByName("findById", true);
    _basemodel.disableRemoteMethodByName("findOne", true);

    _basemodel.disableRemoteMethodByName("replaceById", true);
    _basemodel.disableRemoteMethodByName("createChangeStream", true);
    _basemodel.disableRemoteMethodByName("upsertWithWhere", true);
    _basemodel.disableRemoteMethodByName("replaceOrCreate", true);
    _basemodel.disableRemoteMethodByName("deleteById", true);
    _basemodel.disableRemoteMethodByName("getId", true);
    _basemodel.disableRemoteMethodByName("getSourceId", true);
    _basemodel.disableRemoteMethod("updateAttributes", false);

    _basemodel.disableRemoteMethodByName("confirm", true);
    _basemodel.disableRemoteMethodByName("count", true);
    _basemodel.disableRemoteMethodByName("exists", true);
    _basemodel.disableRemoteMethodByName("resetPassword", true);
};

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});


Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month 
        "d+": this.getDate(), //day 
        "h+": this.getHours(), //hour 
        "m+": this.getMinutes(), //minute 
        "s+": this.getSeconds(), //second 
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter 
        "S": this.getMilliseconds() //millisecond 
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));


