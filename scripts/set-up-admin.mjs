import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrangler = process.argv[2];
if (!wrangler || !existsSync(wrangler)) throw Error('Pass the absolute path to the installed Wrangler CLI.');
const accessFile = resolve(root, '.admin-access.txt');
if (existsSync(accessFile)) throw Error('Admin access details already exist. This setup will not overwrite them.');
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const config = JSON.stringify({salt:salt.toString('base64'),hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64'),iterations:100000});
const result = spawnSync(process.execPath, [wrangler,'secret','put','ADMIN_PASSWORD_HASH','--config',resolve(root,'backend/wrangler.jsonc')], {cwd:root,input:config,encoding:'utf8',windowsHide:true,timeout:120000});
if (result.status !== 0) {console.error('Could not set the administrator password. No access file was written.');process.exit(1);}
writeFileSync(accessFile, 'Rethorium Farm administrator access\n\nSign in: https://rethorioum-farm.pages.dev/admin/\nPassword: '+password+'\n\nKeep this file private. It is excluded from Git and blocked from the website.\nPrices are blank until you set them in the admin page.\n', {encoding:'utf8',flag:'wx',mode:0o600});
console.log('Administrator password configured. Private sign-in details saved to .admin-access.txt.');
