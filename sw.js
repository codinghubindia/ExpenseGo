if(!self.define){let e,s={};const i=(i,n)=>(i=new URL(i+".js",n).href,s[i]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=s,document.head.appendChild(e)}else e=i,importScripts(i),s()})).then((()=>{let e=s[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,r)=>{const l=e||("document"in self?document.currentScript.src:"")||location.href;if(s[l])return;let o={};const t=e=>i(e,l),c={module:{uri:l},exports:o,require:t};s[l]=Promise.all(n.map((e=>c[e]||t(e)))).then((e=>(r(...e),o)))}}define(["./workbox-74f2ef77"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/charts-B5y1MNZu.js",revision:null},{url:"assets/html2canvas.esm-D9496bDv.js",revision:null},{url:"assets/index-BudUjaHQ.js",revision:null},{url:"assets/index.es-BbgCOnPy.js",revision:null},{url:"assets/mui-DwmfyN1d.js",revision:null},{url:"assets/purify.es-63_CBw9X.js",revision:null},{url:"assets/vendor-COJL5AHZ.js",revision:null},{url:"icons/icon.svg",revision:"86f0c9163c4eb30ebc3516a4565cce5a"},{url:"icons/revenue-growth.png",revision:"9aaedbd6aa67aae53ced8c2e93c2e315"},{url:"index.html",revision:"ec3b632d9f64421bc8197f45032e8c06"},{url:"offline.html",revision:"03209edeb6203c98748482a211fd5965"},{url:"registerSW.js",revision:"b32f152ff3d1fdc4433c10cdf8682067"},{url:"revenue-growth.svg",revision:"859970578cb2d17de67d26ab81bf2233"},{url:"vite.svg",revision:"8e3a10e157f75ada21ab742c022d5430"},{url:"revenue-growth.svg",revision:"859970578cb2d17de67d26ab81bf2233"},{url:"manifest.webmanifest",revision:"2fce1f9852b21cc0835b46fdb281faee"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("offline.html"))),e.registerRoute(/^https:\/\/sql\.js\.org\/.*$/,new e.CacheFirst({cacheName:"sql-js-cache",plugins:[new e.ExpirationPlugin({maxEntries:10,maxAgeSeconds:2592e3})]}),"GET")}));
