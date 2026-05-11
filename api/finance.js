import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  const { method } = request;
  const client = await db.connect();

  if (method === 'GET') {
    try {
      const { rows } = await client.sql`SELECT * FROM financial_transactions ORDER BY date DESC;`;
      return response.status(200).json(rows);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { description, amount, category, type } = request.body;
      const result = await client.sql`
        INSERT INTO financial_transactions (description, amount, category, type)
        VALUES (${description}, ${amount}, ${category}, ${type})
        RETURNING *;
      `;
      return response.status(201).json(result.rows[0]);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = request.query;
      await client.sql`DELETE FROM financial_transactions WHERE id = ${id};`;
      return response.status(200).json({ message: 'Transação deletada' });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).end();
}
