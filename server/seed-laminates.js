const fs = require('fs');
const path = require('path');
const getColors = require('get-image-colors');
const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL from environment or fallback to local config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:Parth@123@localhost:5432/laminate_picker",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Folder containing laminate images
const laminatesFolder = path.join(__dirname, '..', 'client', 'laminates');

async function seedLaminates() {
  const files = fs.readdirSync(laminatesFolder);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const imagePath = path.join(laminatesFolder, file);
    try {
      const colors = await getColors(imagePath);
      const dominant = colors[0].hex();

      await pool.query(
        'INSERT INTO laminates (image_path, hex_color) VALUES ($1, $2)',
        [`/laminates/${file}`, dominant]
      );

      console.log(`✅ Inserted: ${file} → ${dominant}`);
    } catch (err) {
      console.error(`❌ Failed to process ${file}:`, err.message);
    }
  }

  await pool.end();
  console.log('🎉 Done seeding laminates.');
}

seedLaminates();
