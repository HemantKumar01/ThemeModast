importScripts("crypto-js.min.js");
importScripts("apis.js");

console.log(
  CryptoJS.AES.decrypt(GEMINI_API_KEY, pswd).toString(CryptoJS.enc.Utf8)
);
