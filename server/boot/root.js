'use strict';

module.exports = function (server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);

  var utils = require('../../common/models/utils')
  var config = require('../../config/config');
  var wechatApi = require('../../common/models/wechatApi')
  router.use(function (req, res, next) {

    //根据token从redis中获取access_token  

    utils.get(config.wechat.token).then(function (data) {
      //获取到值--往下传递  
      if (data) {
        return Promise.resolve(data);
      }
      //没获取到值--从微信服务器端获取,并往下传递  
      else {
        return wechatApi.updateAccessToken();
      }
    }).then(function (data) {
      console.log(data);
      //没有expire_in值--此data是redis中获取到的  
      if (!data.expires_in) {
        console.log('redis获取到值');
        var p = {"access_token":data};
        res.writeHead(200,{"json":true});
        res.write(JSON.stringify(p));
        res.end();//next();  
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

            res.writeHead(200,{"json":true});
            res.write(JSON.stringify(data));
            res.end();//next();  
          }
        })
      }

    })
  })
};
