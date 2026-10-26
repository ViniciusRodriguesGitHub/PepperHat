const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {findFirebaseCli}=require('./setup-gmail.cjs');
try {
  const env={...process.env};
  const portable=path.join(os.tmpdir(),'consenso-security-runtime');
  if(fs.existsSync(portable)){
    const java=fs.readdirSync(portable).map(name=>path.join(portable,name,'bin')).find(bin=>fs.existsSync(path.join(bin,'java.exe')));
    if(java)env.PATH=java+path.delimiter+env.PATH;
  }
  const result=spawnSync(process.execPath,[findFirebaseCli(),'emulators:exec','--only','firestore','--project','demo-consenso','--config','firebase.emulators.json','node --test tests/rules/*.test.cjs'],{cwd:path.resolve(__dirname,'..'),env,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
  // O debug do CLI inclui ambiente e stack traces de recusas esperadas; não os reproduzir.
  const lines=((result.stdout||'')+'\n'+(result.stderr||'')).split(/\r?\n/);
  console.log(lines.filter(line=>/^(ok |not ok |# (tests|pass|fail|duration)|Error:|.*Script exited successfully)/.test(line)).join('\n'));
  if(result.error)console.error('Não foi possível iniciar os testes:',result.error.code);
  if(result.status!==0)console.error('Teste de regras falhou. Confira os logs locais ignorados pelo Git; requer Java 21 e Firebase CLI.');
  process.exitCode=result.status===0?0:1;
}catch(error){console.error(error.message);process.exitCode=1;}
