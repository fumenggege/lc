const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const BAIDU_CONFIG={
  appid:"20251029002485748",
  appkey:"VeSANEP4EZPOVFawx9RS",
  apiurl:"https://fanyi-api.baidu.com/api/trans/vip/translate"
};

function generateSign(appid, q, salt, appkey) {
  const str = appid + q + salt + appkey;
  return crypto.createHash('md5').update(str).digest('hex');
}

app.post('/translate', async (req, res) => {
  try {
    const { text, from = 'zh', to = 'en' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error_code: "400",
        error_msg: "缺少有效翻译文本（必须是字符串）"
      });
    }
    if (!BAIDU_CONFIG.appid || !BAIDU_CONFIG.appkey) {
      return res.status(500).json({
        error_code: "500",
        error_msg: "服务器未配置有效百度APPID或APPKEY"
      });
    }

    const q = text.length > 2000 ? text.substring(0, 2000) : text;
    // 生成随机salt（确保字符串类型）
    const salt = Date.now() + Math.floor(Math.random() * 1000).toString();

    const sign = generateSign(BAIDU_CONFIG.appid, q, salt, BAIDU_CONFIG.appkey);
    //调用百度api
    const response = await axios.get(BAIDU_CONFIG.apiurl,{
      params:{
        q:q,
        from:from,
        to:to,
        appid:BAIDU_CONFIG.appid,
        salt:salt,
        sign:sign,
        dict:0
      },
      timeout:10000,
      headers:{
        'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'
      }
    });

    const result = response.data;

    if (result.error_code) {
      return res.status(400).json({
        error_code: result.error_code,
        error_msg: result.error_msg || '百度翻译API返回错误'
      });
    }

    const translatedText = result.trans_result?.map(item => item.dst).join('') || '';
    if (!translatedText) {
      return res.status(400).json({
        error_code: "400",
        error_msg: "未获取到翻译结果"
      });
    }

    res.json({
      success: true,
      original: q,
      translated: translatedText,
      from: from,
      to: to
    });

  } catch (error) {
    console.error('翻译接口异常:', error.message);
    res.status(500).json({
      error_code: "500",
      error_msg: "翻译服务异常（可能是网络错误或API不可用）"
    });
  }
});

// 启动服务
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器已启动`);
});