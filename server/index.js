const express = require("express");
const cors = require("cors");
const path = require("path"); // Added for handling static paths
const { Pool } = require("pg");

const app = express();
const port = 3001;

app.use(cors({
  origin: 'https://laminate-color-picker.onrender.com'
}));
app.use(express.json());

// ✅ Serve images from the "laminates" folder
app.use("/laminates", express.static(path.join(__dirname, "laminates")));

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "laminate_picker",
  password: "Parth@123",
  port: 5432,
});

// POST: Upload a laminate (image path and hex color)
app.post("/api/laminates", async (req, res) => {
  const { image_path, hex_color } = req.body;

  if (!image_path || !hex_color) {
    return res
      .status(400)
      .json({ error: "image_path and hex_color are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO laminates (image_path, hex_color) VALUES ($1, $2) RETURNING *",
      [image_path, hex_color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting laminate:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Helper: Convert hex color to RGB array
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;

  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Helper: Calculate similarity percentage based on RGB distance
function getSimilarity(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const distance = Math.sqrt(
    (rgb1[0] - rgb2[0]) ** 2 +
    (rgb1[1] - rgb2[1]) ** 2 +
    (rgb1[2] - rgb2[2]) ** 2
  );

  const maxDistance = Math.sqrt(3 * 255 ** 2);
  const similarity = (1 - distance / maxDistance) * 100;
  return Math.round(similarity);
}

// GET: Find laminates similar to the given color
app.get("/api/laminates/similar", async (req, res) => {
  const { color } = req.query;

  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing hex color (e.g. #aabbcc)" });
  }

  try {
    const result = await pool.query("SELECT * FROM laminates");
    const allLaminates = result.rows;

    const similarLaminates = allLaminates
      .map((laminate) => {
        const similarity = getSimilarity(color, laminate.hex_color);
        return { ...laminate, similarity };
      })
      .filter((laminate) => laminate.similarity >= 75)
      .sort((a, b) => b.similarity - a.similarity);

    res.json(similarLaminates);
  } catch (err) {
    console.error("Error finding similar laminates:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Test endpoint
app.get("/", (req, res) => {
  res.send("Laminate Color Picker API is running.");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
