'use strict';
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const port=8861;
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/Modo-caos/avatar-portrait-builder.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.avatarReady===true,{timeout:100000});
  const result=await page.evaluate(()=>({images:window.avatarImages,errors:window.avatarErrors}));
  if(result.errors.length||errors.length||result.images.length!==4)throw Error('Portrait render failure: '+JSON.stringify({asset:result.errors,browser:errors,count:result.images.length}));
  const dest=path.join(process.cwd(),'Modo-caos','assets','styloo','portraits');
  fs.mkdirSync(dest,{recursive:true});
  for(const {name,data,size} of result.images){
   const bytes=Buffer.from(data.split(',')[1],'base64');
   if(bytes.length<4000)throw Error('Suspiciously empty image '+name);
   const output=path.join(dest,name+'.png');
   fs.writeFileSync(output,bytes);
   console.log('RENDERED_PORTRAIT',JSON.stringify({name,bytes:bytes.length,modelSize:size,output}));
  }
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill('SIGTERM');}
})();