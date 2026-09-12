import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Charger .env manuellement si dotenv n'est pas importé
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM || user;
const recipient = process.env.ADMIN_EMAIL || 'juvett38@gmail.com';

console.log('--- Paramètres de test SMTP ---');
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`Secure: ${secure}`);
console.log(`User: ${user}`);
console.log(`From: ${from}`);
console.log(`Destinataire de test: ${recipient}`);
console.log('-------------------------------');

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

try {
  console.log('1. Vérification de la connexion au serveur SMTP...');
  await transporter.verify();
  console.log(' Connexion SMTP réussie avec Brevo !');

  console.log(`2. Envoi d'un email de test vers ${recipient}...`);
  const info = await transporter.sendMail({
    from,
    to: recipient,
    subject: '[ArtisanConnect] Test d’envoi d’email réussi',
    text: `Bonjour,\n\nCeci est un email de test pour confirmer la configuration de l’adresse d’envoi ${from}.\n\nSi vous recevez ce message, votre configuration SMTP est 100% opérationnelle.\n\nL'équipe ArtisanConnect`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292524;">
        <h2 style="color: #b45309;">ArtisanConnect - Test d’email</h2>
        <p>Bonjour,</p>
        <p>Ceci est un email de test confirmant que l'adresse d'expédition <strong>${from}</strong> fonctionne correctement avec Brevo.</p>
        <div style="background: #f5f5f4; border-left: 4px solid #b45309; padding: 12px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px;"> <strong>Statut :</strong> Configuration SMTP et expéditeur opérationnels.</p>
        </div>
        <p style="font-size: 12px; color: #78716c;">Date du test : ${new Date().toLocaleString()}</p>
      </div>
    `,
  });

  console.log(` Email envoyé avec succès ! MessageId: ${info.messageId}`);
} catch (error) {
  console.error(' Erreur lors du test SMTP :', error);
}
