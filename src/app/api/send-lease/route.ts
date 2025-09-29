import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    // Vérifier si la clé API Resend est disponible
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY non configurée - fonctionnalité d\'envoi d\'email désactivée');
      return NextResponse.json({
        error: 'Service d\'envoi d\'email non configuré. Contactez l\'administrateur.'
      }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { leaseInfo, pdfBase64 } = await req.json();

    if (!leaseInfo || !leaseInfo.tenantEmail || !pdfBase64) {
      return NextResponse.json({ error: 'Données manquantes pour l\`envoi de l\`e-mail.' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const { tenantName, propertyName, tenantEmail } = leaseInfo;

    // Envoyer l'e-mail
    const { data, error } = await resend.emails.send({
      from: 'SmartImmo <onboarding@resend.dev>', // Remplacez par votre domaine
      to: [tenantEmail],
      subject: `Votre contrat de location pour le bien ${propertyName}`,
      html: `<p>Bonjour ${tenantName},</p><p>Veuillez trouver ci-joint votre contrat de location pour le bien <strong>${propertyName}</strong>.</p><p>Cordialement,</p>`,
      attachments: [
        {
          filename: `bail_${propertyName}_${tenantName}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Erreur lors de l\`envoi de l\`e-mail.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'E-mail envoyé avec succès !' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
