const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

// Mock service account configuration for testing
const mockServiceAccount = {
  "type": "service_account",
  "project_id": "shoreline-tzs9g-47d06",
  "private_key_id": "mock-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\nxIuOiQ4SiYPi6z02FiEi9SDKXSvj3/6s+fAHZ+Rz+Gx3WSgNiYqQIDAQABAoIBAA\nKtMzO8FbvXY9tcddAoGBAOWmsZwi5MfVlcmgdTMUDjGLPOBVK4AdLTtMJgKFoWIu\nAoGBANWGXhmO+Ss1azVjsqg3WfY1VBgSI7vpD6lp+Dan+X3hwEs6lTjcfR3/diHL\nAoGAD+lrxfXXh2xQ3vOUTsJBPkmHJmINkPNn86wXyhxvjMIcIbGpFAh7ZX9oid3M\nUECKQ8mTtNdjHwwqFqouHirzxoECgYEAx/oIYDeTXiusHMUon1nw37RzQcLjn4lE\nOIZxZVUcVaBnfC9i9b5ruKQAUdMPKSxFtXqI90XtEISHBdteFyy+BdE=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@shoreline-tzs9g-47d06.iam.gserviceaccount.com",
  "client_id": "mock-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40shoreline-tzs9g-47d06.iam.gserviceaccount.com"
};

const lines = [
  'ADMIN_RTDB_URL=https://shoreline-tzs9g-47d06-default-rtdb.firebaseio.com/',
  'EMAIL_USER=beachguardians01@gmail.com',
  'EMAIL_PASS=wnhn uhxo wywk zcar',
];

fs.writeFileSync(envPath, lines.join('\n'), { encoding: 'utf8' });
console.log(`Wrote ${envPath}`);

