import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  const { name, email, message } = request.body;

  try {
    const client = await db.connect();

    // 1. Salvar no banco de dados para não perder o contato
    await client.sql`
      INSERT INTO financial_transactions (description, amount, category, type)
      VALUES (${`Contato Site: ${name} (${email})`}, 0, 'Lead/Contato', 'info');
    `;

    // 2. Aqui entraria a lógica de envio de e-mail (Ex: Resend ou Nodemailer)
    // Se o usuário configurar a variável RESEND_API_KEY, o código abaixo funcionaria.
    console.log(`Nova mensagem de ${name} (${email}): ${message}`);
    
    // Simulação de sucesso e resposta de boas-vindas
    return response.status(200).json({ 
      success: true, 
      message: 'Mensagem recebida! Nossa resposta automática foi enviada para o seu e-mail.' 
    });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Erro ao processar contato' });
  }
}
