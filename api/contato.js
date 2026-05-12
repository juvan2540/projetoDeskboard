import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  const { name, email, message } = request.body;
  const resendApiKey = process.env.RESEND_API_KEY;

  try {
    const client = await db.connect();

    // 1. Salvar no banco de dados para não perder o contato
    await client.sql`
      INSERT INTO os_records (customer, status, description, amount, type)
      VALUES (${name}, 'Aguardando', ${`Contato/Orçamento: ${message} (Email: ${email})`}, 0, 'income');
    `;

    // 2. Envio de E-mail via Resend
    if (resendApiKey) {
      // E-mail para o Cliente (Confirmação)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'JucaAssistência <onboarding@resend.dev>', // Idealmente usar domínio próprio depois
          to: email,
          subject: 'Recebemos seu pedido de orçamento! 📱',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
              <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">JucaAssistência</h1>
                <p style="margin: 5px 0 0;">Soluções em Tecnologia</p>
              </div>
              <div style="padding: 30px; color: #333; line-height: 1.6;">
                <h2>Olá, ${name}!</h2>
                <p>Recebemos sua mensagem sobre: <strong>"${message}"</strong></p>
                <p>Nossa equipe técnica já foi notificada e em breve entraremos em contato com uma análise detalhada e valores para o seu reparo.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">Dica: Se preferir agilizar, você também pode nos chamar no WhatsApp clicando no botão do site.</p>
                </div>
                <p>Obrigado por escolher a JucaAssistência!</p>
              </div>
              <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; 2026 JucaAssistência - Especialista em Smartphones
              </div>
            </div>
          `
        })
      });

      // E-mail para o Administrador (Notificação)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Sistema Juca <onboarding@resend.dev>',
          to: 'contato@jucadevsolutions.com.br', // Email do dono
          subject: `NOVO ORÇAMENTO: ${name}`,
          html: `<p><strong>Nome:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Mensagem:</strong> ${message}</p>`
        })
      });
    } else {
      console.warn('RESEND_API_KEY não configurada. E-mail não enviado.');
    }

    return response.status(200).json({ 
      success: true, 
      message: 'Mensagem recebida! Nossa resposta automática foi enviada para o seu e-mail.' 
    });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Erro ao processar contato' });
  }
}
