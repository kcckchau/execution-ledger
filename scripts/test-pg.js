require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const res = await client.query("select now()");
  console.log("connected:", res.rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
