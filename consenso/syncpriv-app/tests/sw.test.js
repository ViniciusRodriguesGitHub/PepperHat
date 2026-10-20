const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../sw.js'), 'utf8');
function environment(offline) {
 const listeners={};const state={};const cached={source:'old'};const response={ok:true,source:'new',clone(){return this}};
 const c={URL,console,self:{location:{origin:'https://example.com'},registration:{scope:'https://example.com/PepperHat/consenso/syncpriv-app/'},addEventListener:(type,fn)=>listeners[type]=fn},fetch:async()=>{if(offline)throw Error('offline');return response},caches:{open:async()=>({put:async()=>state.updated=true}),match:async key=>{state.fallback=key;return cached}}};
 vm.runInNewContext(code,c);return {listeners,state};
}
test('navegação usa versão atual da rede antes da cópia antiga no cache',async()=>{
 const {listeners,state}=environment(false);let pending;listeners.fetch({request:{url:'https://example.com/PepperHat/consenso/syncpriv-app/',mode:'navigate',method:'GET'},respondWith:value=>pending=value});assert.equal((await pending).source,'new');assert.equal(state.updated,true);
});
test('navegação offline preserva abertura da cópia em cache',async()=>{
 const {listeners}=environment(true);let pending;listeners.fetch({request:{url:'https://example.com/PepperHat/consenso/syncpriv-app/',mode:'navigate',method:'GET'},respondWith:value=>pending=value});assert.equal((await pending).source,'old');
});
