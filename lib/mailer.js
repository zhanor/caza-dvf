import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Configuration SMTP manquante (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Envoie un email d'invitation avec le lien d'inscription.
 * @param {string} to - Adresse email du destinataire
 * @param {string} link - Lien d'inscription avec token
 * @returns {Promise<void>}
 */
export async function sendInvitationEmail(to, link) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const baseUrl = process.env.NEXTAUTH_URL || 'https://cazadvf.fr';

  await transport.sendMail({
    from: `"CaZa DVF Pro" <${from}>`,
    to,
    subject: 'Votre invitation CaZa DVF Pro',
    text: `Bonjour,\n\nVous avez été invité(e) à rejoindre CaZa DVF Pro.\n\nCliquez sur ce lien pour créer votre compte :\n${link}\n\nCe lien est valable 48h.\n\nCordialement,\nL'équipe CaZa DVF`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#2563eb;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">CaZa DVF <span style="font-size:11px;font-weight:700;background:rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;letter-spacing:.05em">PRO</span></h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Vous êtes invité(e) !</h2>
      <p style="margin:0 0 24px;color:#475569;line-height:1.6">Vous avez été invité(e) à accéder à <strong>CaZa DVF Pro</strong>, l'outil d'évaluation immobilière avec les données DVF.</p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Créer mon compte →</a>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:13px">Ce lien expire dans 48h. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:12px">Lien : <a href="${link}" style="color:#2563eb;word-break:break-all">${link}</a></p>
    </div>
  </div>
</body>
</html>`,
  });
}
