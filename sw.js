if(!self.define){let e,s={};const i=(i,n)=>(i=new URL(i+".js",n).href,s[i]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=s,document.head.appendChild(e)}else e=i,importScripts(i),s()})).then((()=>{let e=s[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,r)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(s[t])return;let c={};const o=e=>i(e,t),l={module:{uri:t},exports:c,require:o};s[t]=Promise.all(n.map((e=>l[e]||o(e)))).then((e=>(r(...e),c)))}}define(["./workbox-74f2ef77"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-D1dtWf2u.js",revision:null},{url:"assets/index.es-Cy52-OcD.js",revision:null},{url:"assets/purify.es-C_uT9hQ1.js",revision:null},{url:"icons/icon.svg",revision:"1821c958bbe5e0a6a4563025af907760"},{url:"index.html",revision:"63da79e65de82ccbdbfcdc8cc9e0d581"},{url:"offline.html",revision:"7cbe921b0eb1853768121d8a1f5921bc"},{url:"registerSW.js",revision:"b32f152ff3d1fdc4433c10cdf8682067"},{url:"vite.svg",revision:"8e3a10e157f75ada21ab742c022d5430"},{url:"manifest.webmanifest",revision:"7bc270bbe0acdf06572ebc6e5585d87d"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html"))),e.registerRoute(/^https:\/\/sql\.js\.org\/.*$/,new e.CacheFirst({cacheName:"sql-js-cache",plugins:[new e.ExpirationPlugin({maxEntries:10,maxAgeSeconds:2592e3})]}),"GET")}));
