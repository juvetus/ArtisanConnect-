import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

function loadEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim().replace(/^['"]|['"]$/g, '')]),
  );
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

const env = loadEnv(await readFile(new URL('../.env', import.meta.url), 'utf8'));
const baseUrl = (env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com').replace(/\/$/, '');
const subscriptionKey = env.MOMO_SUBSCRIPTION_KEY;
const callbackHost = new URL(env.API_URL || 'http://localhost:3001').hostname;

if (!subscriptionKey) {
  throw new Error('MOMO_SUBSCRIPTION_KEY est manquant dans backend/.env');
}

if (callbackHost === 'localhost' || callbackHost === '127.0.0.1') {
  console.warn('Attention : API_URL pointe vers localhost. Cela suffit pour créer les identifiants, mais pas pour recevoir les callbacks MTN.');
}

const apiUser = randomUUID();
const headers = {
  'Content-Type': 'application/json',
  'Ocp-Apim-Subscription-Key': subscriptionKey,
  'X-Reference-Id': apiUser,
};

await requestJson(`${baseUrl}/v1_0/apiuser`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ providerCallbackHost: callbackHost }),
});

const apiKeyResponse = await requestJson(`${baseUrl}/v1_0/apiuser/${apiUser}/apikey`, {
  method: 'POST',
  headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
});

const apiKey = apiKeyResponse?.apiKey || apiKeyResponse?.api_key;
if (!apiKey) {
  throw new Error(`MTN a créé l’utilisateur, mais aucune API Key n’a été renvoyée: ${JSON.stringify(apiKeyResponse)}`);
}

console.log('\nAPI User et API Key créés dans MTN MoMo Sandbox.');
console.log('Ajoute ces lignes dans backend/.env, sans les publier :\n');
console.log(`MOMO_MODE=sandbox`);
console.log(`MOMO_API_USER=${apiUser}`);
console.log(`MOMO_API_KEY=${apiKey}`);
console.log('\nLa Subscription Key existante reste dans MOMO_SUBSCRIPTION_KEY.');