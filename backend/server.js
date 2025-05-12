const express = require("express");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const ExcelJS = require("exceljs");
const cors = require("cors");
const fs = require("fs");
const cookieParser = require("cookie-parser"); // Added for cookie handling
const { v4: uuidv4 } = require("uuid"); // For generating session IDs

const app = express();
const port = 3000;

// Middleware to parse JSON, handle CORS, serve static files, and parse cookies
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use(cookieParser()); // Enable cookie parsing
app.use(express.urlencoded({ extended: true }));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}-${originalName}`);
  },
});
const upload = multer({ storage });

// MySQL connection pool
const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "continuum_user",
  password: "yourpassword",
  database: "inventory_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+05:30",
});

// Test database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database");
    connection.release();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
})();

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route to handle login and set cookie
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Replace with actual user validation logic
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a session ID and store it
    const sessionId = uuidv4();
    await pool.query(
      "INSERT INTO sessions (session_id, username, created_at) VALUES (?, ?, NOW())",
      [sessionId, username]
    );

    // Set a secure, HTTP-only cookie
    res.cookie("sessionId", sessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure in production
      sameSite: "strict",
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to check if user is authenticated
app.get("/check-auth", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const [sessions] = await pool.query(
      "SELECT * FROM sessions WHERE session_id = ?",
      [sessionId]
    );
    if (sessions.length === 0) {
      res.clearCookie("sessionId");
      return res.status(401).json({ authenticated: false });
    }

    res.json({ authenticated: true, username: sessions[0].username });
  } catch (error) {
    console.error("Error checking auth:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to logout and clear cookie
app.post("/logout", (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    pool.query("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
    res.clearCookie("sessionId");
  }
  res.json({ message: "Logged out successfully" });
});

// Existing routes (fetchColumns, fetchData, assets, etc.) remain unchanged
app.get("/fetchColumns/:tableType", async (req, res) => {
  const { tableType } = req.params;
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${tableType}`);
    const columnNames = columns.map((col) => col.Field);
    res.json({ columns: columnNames });
  } catch (error) {
    console.error(`Error fetching columns for ${tableType}:`, error);
    res.status(500).send("Error fetching columns");
  }
});

app.get("/fetchData/:tableType", async (req, res) => {
  const { tableType } = req.params;
  try {
    const [rows] = await pool.query(`SELECT * FROM ${tableType} ORDER BY sr_no ASC`);
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching data for ${tableType}:`, error);
    res.status(500).send("Error fetching data");
  }
});

app.post("/assets", upload.single("invoice_file"), async (req, res) => {
  const { tableType, ...assetData } = req.body;
  const invoiceFile = req.file ? `uploads/${req.file.filename}` : null;

  if (invoiceFile) {
    assetData.invoice_file = invoiceFile;
  }

  for (const [key, value] of Object.entries(assetData)) {
    if (key.toLowerCase().includes("date") && value) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        console.error(`Invalid date format for ${key}: ${value}`);
        return res.status(400).send(`Invalid date format for ${key}. Expected YYYY-MM-DD.`);
      }
      assetData[key] = value;
    }
  }

  const columns = Object.keys(assetData).join(", ");
  const placeholders = Object.keys(assetData)
    .map(() => "?")
    .join(", ");
  const values = Object.values(assetData);

  try {
    const query = `INSERT INTO ${tableType} (${columns}, create_date, create_time, create_user) VALUES (${placeholders}, CURDATE(), CURTIME(), 'admin')`;
    const [result] = await pool.query(query, values);
    res.json({ message: "Asset added successfully", id: result.insertId });
  } catch (error) {
    console.error("Error adding asset:", error);
    res.status(500).send("Error adding asset");
  }
});

app.post("/assets/updateByKey", async (req, res) => {
  const { tableType, key, updates } = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).send("No fields to update");
  }

  for (const [key, value] of Object.entries(updates)) {
    if (key.toLowerCase().includes("date") && value) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        return res.status(400).send(`Invalid date format for ${key}. Expected YYYY-MM-DD.`);
      }
      updates[key] = value;
    }
  }

  const setClause = Object.keys(updates)
    .map((col) => `${col} = ?`)
    .join(", ");
  const values = [...Object.values(updates)];
  let whereClause = "";
  const whereValues = [];
  if (tableType.toLowerCase() === "systems") {
    whereClause =
      "sr_no = ? AND monitor_asset_tag = ? AND machine_asset_tag = ?";
    whereValues.push(key.sr_no, key.monitor_asset_tag, key.machine_asset_tag);
  } else {
    whereClause = "sr_no = ? AND asset_tag = ?";
    whereValues.push(key.sr_no, key.asset_tag);
  }

  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${tableType}`);
    const dateColumns = columns
      .filter(col => col.Type.includes('date') || col.Type.includes('DATE'))
      .map(col => col.Field);
    let selectClause = '*';
    if (dateColumns.length > 0) {
      const formattedColumns = columns.map(col => {
        if (dateColumns.includes(col.Field)) {
          return `DATE_FORMAT(${col.Field}, '%Y-%m-%d') AS ${col.Field}`;
        }
        return col.Field;
      }).join(', ');
      selectClause = formattedColumns;
    }

    const [rows] = await pool.query(
      `SELECT ${selectClause} FROM ${tableType} WHERE ${whereClause}`,
      whereValues
    );
    if (rows.length === 0) {
      return res.status(404).send("Asset not found");
    }
    const currentAsset = rows[0];

    const updateQuery = `UPDATE ${tableType} SET ${setClause}, change_date = CURDATE(), change_time = CURTIME(), change_user = 'admin' WHERE ${whereClause}`;
    const [result] = await pool.query(updateQuery, [...values, ...whereValues]);
    if (result.affectedRows === 0) {
      return res.status(404).send("Asset not found");
    }

    const changeUser = "admin";
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentAsset[field] || null;
      const normalizedOldValue = oldValue === null ? "" : oldValue.toString();
      const normalizedNewValue = newValue === null ? "" : newValue.toString();
      if (normalizedOldValue !== normalizedNewValue) {
        const historyQuery = `
          INSERT INTO asset_history (table_type, sr_no, machine_asset_tag, monitor_asset_tag, asset_tag, field_name, old_value, new_value, changed_by, change_date, change_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())
        `;
        const historyValues = [
          tableType,
          key.sr_no,
          key.machine_asset_tag || null,
          key.monitor_asset_tag || null,
          key.asset_tag || null,
          field,
          oldValue,
          newValue,
          changeUser,
        ];
        await pool.query(historyQuery, historyValues);
      }
    }

    res.json({ message: "Asset updated successfully" });
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).send("Error updating asset");
  }
});

app.post("/assetHistory", async (req, res) => {
  const { tableType, sr_no, machine_asset_tag, monitor_asset_tag, asset_tag } = req.body;
  if (!tableType || !sr_no) {
    return res.status(400).json({ error: "tableType and sr_no are required" });
  }

  try {
    let query = `
      SELECT id, field_name, old_value, new_value, changed_by, DATE_FORMAT(change_date, '%Y-%m-%d') AS change_date, change_time
      FROM asset_history
      WHERE table_type = ?
        AND sr_no = ?
    `;
    let values = [tableType, sr_no];

    if (tableType.toLowerCase() === "systems") {
      if (!machine_asset_tag || !monitor_asset_tag) {
        return res.status(400).json({ error: "machine_asset_tag and monitor_asset_tag are required for tableType 'systems'" });
      }
      query += ` AND machine_asset_tag = ? AND monitor_asset_tag = ?`;
      values.push(machine_asset_tag, monitor_asset_tag);
    } else {
      if (!asset_tag) {
        return res.status(400).json({ error: "asset_tag is required for non-systems tableType" });
      }
      query += ` AND asset_tag = ?`;
      values.push(asset_tag);
    }

    query += ` ORDER BY change_date DESC, change_time DESC`;
    const [rows] = await pool.query(query, values);
    res.json({ history: rows });
  } catch (error) {
    console.error("Error fetching asset history:", error);
    res.status(500).json({ error: "Error fetching asset history" });
  }
});

app.post("/export-excel", async (req, res) => {
  const { data } = req.body;
  if (!data || data.length === 0) {
    return res.status(400).send("No data provided to export");
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Assets");
    const columns = Object.keys(data[0]).filter(
      (key) =>
        ![
          "create_user",
          "create_time",
          "create_date",
          "change_user",
          "change_time",
          "change_date",
        ].includes(key)
    );
    worksheet.columns = columns.map((key) => ({
      header: key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      key,
      width: 20,
    }));

    data.forEach((row) => {
      const filteredRow = {};
      columns.forEach((key) => {
        filteredRow[key] = row[key];
      });
      worksheet.addRow(filteredRow);
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.columns.forEach((column) => {
      let maxLength = column.header.length;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        maxLength = Math.max(maxLength, cellLength);
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IT_Inventory_Management.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).send("Error generating Excel file");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});