const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const lines = [
  'ADMIN_KEY_PATH=g:\\shoreline-tzs9g-47d06-firebase-adminsdk-fbsvc-c8d6211888.json',
  'EMAIL_USER=beachguardians01@gmail.com',
  'EMAIL_PASS=wnhn uhxo wywk zcar',
];

fs.writeFileSync(envPath, lines.join('\n'), { encoding: 'utf8' });
console.log(`Wrote ${envPath}`);

