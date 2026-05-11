import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  try {
    const client = await db.connect();
    
    // Create OS Records table
    await client.sql`
      CREATE TABLE IF NOT EXISTS os_records (
        id SERIAL PRIMARY KEY,
        customer TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT,
        amount DECIMAL(10, 2) NOT NULL,
        type TEXT DEFAULT 'income',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Financial Transactions table
    await client.sql`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category TEXT,
        type TEXT NOT NULL, -- 'income' or 'expense'
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return response.status(200).json({ message: 'Tabelas inicializadas com sucesso!' });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
