const fs = require('fs');
const path = require('path');
const getColors = require('get-image-colors');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "laminate_picker",
  password: "Parth@123",
  port: 5432,
});

// Folder with laminate images
const laminatesFolder = path.join(__dirname, '..', 'client', 'laminates');

async function seedLaminates() {
  const files = fs.readdirSync(laminatesFolder);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const imagePath = path.join(laminatesFolder, file);
    try {
      const colors = await getColors(imagePath);
      const dominant = colors[0].hex(); // Most dominant color

      // ✅ Insert full relative path like /laminates/81401.jpg
      await pool.query(
        'INSERT INTO laminates (image_path, hex_color) VALUES ($1, $2)',
        [`/laminates/${file}`, dominant]
      );

      console.log(`✅ Inserted: ${file} → ${dominant}`);
    } catch (err) {
      console.error(`❌ Failed to process ${file}:`, err);
    }
  }

  await pool.end();
  console.log('🎉 Done seeding laminates.');
}

seedLaminates();
