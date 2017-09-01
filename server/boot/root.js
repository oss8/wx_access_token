'use strict';

module.exports = function (server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);
  var _ = require('underscore');

  var utils = require('../../common/models/utils')
  var configs = require('../../config/config');
  var wechatApi = require('../../common/models/wechatapi')

  var request = require('request');
  var sha1 = require('sha1'); 

  router.use(function (req, res, next) {

    if (req.path == '/token') {
      getToken(req, res, next);
    } else if (req.path == '/ticket') {
      getTicket(req, res, next)
    } else {
      next();
    }

  })

  function getTicket(req, res, next) {
    var appId = req.query.appId;
    var url = req.query.url;

    if (_.isUndefined(appId)) {
      appId = 'wx397644d24ec87fd1';
    }

    if (_.isUndefined(url)) {
      res.writeHead(403, { "errcode": 100002, "errmsg": "url is Empty" });
      res.end();
      return;
    }    

    var config = _.find(configs, function (item) {
      return item.wechat.appID == appId;
    })

    if (_.isUndefined(config)) {
      res.writeHead(403, { "errcode": 100001, "errmsg": "AppID is not find" });
      res.end();
      return;
    }

    utils.get(config.wechat.token).then(function (data) {
      //获取到值--往下传递  
      if (data) {
        return Promise.resolve(data);
      }
      //没获取到值--从微信服务器端获取,并往下传递  
      else {
        return wechatApi.updateAccessToken(appId);
      }
    }).then(function (data) {
      console.log(data);
      //没有expire_in值--此data是redis中获取到的  
      if (!data.expires_in) {
        console.log('getTicket redis获取到值');
        _getTicket(res, req, next, appId, data, url)
      }
      //有expire_in值--此data是微信端获取到的  
      else {
        console.log('getTicket redis中无值');
        utils.set(config.wechat.token, `${data.access_token}`, 7180).then(function (result) {
          if (result == 'OK') {
            _getTicket(res, req, next, appId, data.access_token, url)
          }
        })
      }
    });
  }

  function _getTicket(res, req, next, appId, access_token, url) {

    var winxinconfig = {
      grant_type: 'client_credential',
      noncestr: Math.random().toString(36).substr(2, 15),
      ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
      timestamp: Math.floor(Date.now() / 1000) //精确到秒
    }

    request(winxinconfig.ticketUrl + '?access_token=' + access_token + '&type=jsapi', function (error, resp, json) {
      if (!error && resp.statusCode == 200) {
        var ticketMap = JSON.parse(json);
        console.log('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url);
        var Data = {
          noncestr: winxinconfig.noncestr,
          timestamp: winxinconfig.timestamp,
          url: url,
          appid: appId,
          signature: sha1('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url)
        };

        res.send(Data);
      }else{
        res.send(resp);
      }
    })
  }



  function getToken(req, res, next) {
    //根据token从redis中获取access_token  
    var appId = req.query.appId;
    if (_.isUndefined(appId)) {
      appId = 'wx397644d24ec87fd1';
    }

    var config = _.find(configs, function (item) {
      return item.wechat.appID == appId;
    })

    if (_.isUndefined(config)) {
      res.writeHead(403, { "errcode": 100001, "errmsg": "AppID is not find" });
      res.end();
      return;
    }

    utils.get(config.wechat.token).then(function (data) {
      //获取到值--往下传递  
      if (data) {
        return Promise.resolve(data);
      }
      //没获取到值--从微信服务器端获取,并往下传递  
      else {
        return wechatApi.updateAccessToken(appId);
      }
    }).then(function (data) {
      console.log(data);
      //没有expire_in值--此data是redis中获取到的  
      if (!data.expires_in) {
        console.log('redis获取到值');
        var p = { "access_token": data };

        if (!_.isUndefined(data.errcode)) {
          res.send(data);
        } else {
          res.send(p);
        }
        //res.end();//next();  
      }
      //有expire_in值--此data是微信端获取到的  
      else {
        console.log('redis中无值');
        /** 
         * 保存到redis中,由于微信的access_token是7200秒过期, 
         * 存到redis中的数据减少20秒,设置为7180秒过期 
         */
        utils.set(config.wechat.token, `${data.access_token}`, 7180).then(function (result) {
          if (result == 'OK') {

            //res.writeHead(200,{"json":true});
            if (!_.isUndefined(data.errcode)) {
              res.send(data);
            } else {
              res.send(data);
            }

          }
        })
      }

    })
  }
};
