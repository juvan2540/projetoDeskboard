import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  const { method } = request;
  const client = await db.connect();

  if (method === 'GET') {
    try {
      const { rows } = await client.sql`SELECT * FROM os_records ORDER BY date DESC;`;
      return response.status(200).json(rows);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { customer, status, description, amount, type } = request.body;
      const result = await client.sql`
        INSERT INTO os_records (customer, status, description, amount, type)
        VALUES (${customer}, ${status}, ${description}, ${amount}, ${type})
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
      await client.sql`DELETE FROM os_records WHERE id = ${id};`;
      return response.status(200).json({ message: 'Registro deletado' });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).end();
}
