const test = require('node:test');
const assert = require('node:assert/strict');
const { gmailConfig, mergeEnv } = require('../scripts/setup-gmail.cjs');
test('assistente recusa senha normal e remetentes com injecao de cabecalho', () => {
  assert.throws(() => gmailConfig({email:'teste@gmail.com',password:'normal'}), /senha de app/);
  assert.throws(() => gmailConfig({email:'teste@gmail.com\nBcc:outro@gmail.com',password:'abcdefghijklmnop'}), /endereco/);
  assert.deepEqual(gmailConfig({email:' TESTE@gmail.com ',password:'abcd efgh ijkl mnop'}), {email:'teste@gmail.com',password:'abcdefghijklmnop'});
});
test('configuracao preserva outros parametros sem gravar a senha SMTP', () => {
  const value = mergeEnv('OTHER=value\nCONSENSO_SMTP_HOST=old\nCONSENSO_SMTP_PASSWORD=old-secret\n', 'teste@gmail.com');
  assert.match(value,/OTHER=value/);
  assert.match(value,/CONSENSO_SMTP_HOST=smtp.gmail.com/);
  assert.equal((value.match(/CONSENSO_SMTP_HOST=/g)||[]).length,1);
  assert.doesNotMatch(value,/PASSWORD|old-secret/);
});
