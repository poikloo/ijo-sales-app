// tesseract.js 워커 (Electron용): 언어 데이터를 로컬 파일에서만 읽음 (네트워크 사용 안 함)
const {parentPort}=require('worker_threads'),fs=require('fs'),{fileURLToPath}=require('url');
const worker=require('tesseract.js/src/worker-script'),getCore=require('tesseract.js/src/worker-script/node/getCore'),gunzip=require('tesseract.js/src/worker-script/node/gunzip'),cache=require('tesseract.js/src/worker-script/node/cache');
const localFetch=async u=>{if(!/^file:/i.test(u))throw new Error('오프라인 전용: '+u);const b=fs.readFileSync(fileURLToPath(u));return {ok:true,status:200,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
parentPort.on('message',p=>worker.dispatchHandlers(p,o=>parentPort.postMessage(o)));
worker.setAdapter({getCore,gunzip,fetch:localFetch,...cache});
