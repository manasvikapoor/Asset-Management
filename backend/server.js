const express = require("express");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const ExcelJS = require("exceljs");
const cors = require("cors");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;

// Middleware
app.use(express.json({ limit: "20mb" }));
app.use(cors({
  origin: 'http://localhost:5501',
  credentials: true
}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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

// Test database connection
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

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const sessionId = uuidv4();
    await pool.query(
      "INSERT INTO sessions (session_id, username, created_at) VALUES (?, ?, NOW())",
      [sessionId, username]
    );

    res.cookie("sessionId", sessionId, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Check auth route
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

// Logout route
app.post("/logout", (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    pool.query("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
    res.clearCookie("sessionId");
  }
  res.json({ message: "Logged out successfully" });
});

// KDS fetch route
app.get('/kdsFetch/:kdsCode', async (req, res) => {
  const { kdsCode } = req.params;

  if (!kdsCode || typeof kdsCode !== 'string') {
    return res.status(400).json({ error: 'Invalid KDS code' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT value FROM kds_fetch WHERE kds_code = ? and status = "ACTIVE" ORDER BY value ASC',
      [kdsCode.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `No values found for KDS code: ${kdsCode}` });
    }
    const values = rows.map(row => row.value);
    res.status(200).json({ values });
  } catch (error) {
    console.error(`Error fetching dropdown values for ${kdsCode}:`, error.message);
    res.status(500).json({ error: 'Server error while fetching dropdown values' });
  }
});

// Fetch columns route
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

// Fetch data route
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

// Fetch last counter route
app.post("/fetchLastCounter", async (req, res) => {
  const { company, deviceType, tableType, financialYear, isMachine } = req.body;
  if (!company || !deviceType || !tableType || !financialYear || isMachine === undefined) {
    return res.status(400).json({ error: "Company, deviceType, tableType, and isMachine are required" });
  }

  try {
    const column = isMachine ? "machine_asset_tag" : "monitor_asset_tag";
    const [rows] = await pool.query(
      `SELECT ${column} 
       FROM ${tableType} 
       WHERE company = ? 
       AND ${column} LIKE ? 
       AND ${column} IS NOT NULL 
       AND ${column} != 'N/A'`,
      [company, `%/${deviceType}/${financialYear}/%`]
    );

    let lastCounter = 0;
    if (rows.length > 0) {
      const counters = rows.map(row => {
        const tag = row[column];
        const parts = tag.split("/");
        if (parts.length === 4) {
          const counterPart = parts[3].split(" ")[0];
          const counter = parseInt(counterPart, 10);
          return isNaN(counter) ? 0 : counter;
        }
        return 0;
      });
      lastCounter = Math.max(...counters);
    }

    res.json({ lastCounter });
  } catch (error) {
    console.error("Error fetching last counter:", error);
    res.status(500).json({ error: "Error fetching last counter" });
  }
});

// Assets route
app.post("/assets", upload.single("invoice_file"), async (req, res) => {
  const tableType = req.body.tableType;
  let deviceType = req.body.device_type;

  if (Array.isArray(deviceType)) {
    deviceType = deviceType.length > 0 ? deviceType[0] : null;
  }

  if (!tableType) {
    return res.status(400).json({ error: "Table type is required" });
  }

  if (tableType.toLowerCase() === "systems") {
    if (!deviceType || typeof deviceType !== "string") {
      return res.status(400).json({ error: "device_type must be a non-empty string" });
    }
    const validDeviceTypes = ["Laptop", "Monitor", "Desktop", "Workstation", "All-in-one"];
    if (!validDeviceTypes.includes(deviceType)) {
      return res.status(400).json({ error: "Invalid device_type value" });
    }
  }

  try {
    const [columnsResult] = await pool.query(`SHOW COLUMNS FROM ${tableType}`);
    const validColumns = columnsResult.map((col) => col.Field).filter(
      (col) => !["create_user", "create_time", "create_date", "change_user", "change_time", "change_date"].includes(col)
    );

    if (req.file) {
      console.log(`invoice_file: ${req.file.path}`);
    }

    const data = {};
    validColumns.forEach((column) => {
      if (column === "invoice_file") {
        data[column] = req.file ? req.file.path : null;
      } else if (column === "device_type") {
        data[column] = deviceType;
      } else if (column === "monitor_date_of_purchase" || column === "machine_date_of_purchase") {
        let value = req.body[column];
        if (Array.isArray(value)) {
          value = (value.length > 0 && value[0] !== '') ? value[0] : null;
        }
        data[column] = value === "" || value === "undefined" ? null : value || null;
      } else {
        data[column] = req.body[column] === "" || req.body[column] === "undefined" ? null : req.body[column] || null;
      }
    });

    const dateFields = ["machine_date_of_purchase", "date_of_issue", "warranty_end_date"];
    dateFields.forEach((field) => {
      if (data[field] === "null" || !data[field]) {
        data[field] = null;
      } else if (data[field]) {
        const date = new Date(data[field]);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ error: `Invalid date format for ${field}` });
        }
        data[field] = data[field];
      }
    });

    console.log("Data to insert:", data);

    const columns = validColumns.filter((key) => key in data);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((key) => data[key]);

    const query = `
      INSERT INTO ${tableType} (${columns.join(", ")})
      VALUES (${placeholders})
    `;

    console.log("Executing query:", query);
    console.log("Values:", values);

    const [result] = await pool.query(query, values);
    res.status(201).json({ message: "Asset added successfully", id: result.insertId });
  } catch (error) {
    console.error("Error adding asset:", error.message);
    res.status(500).json({ error: `Error adding asset: ${error.message}` });
  }
});

// Update asset route
app.post("/assets/updateByKey", async (req, res) => {
  const { tableType, key, updates } = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).send("No fields to update");
  }

  const dateFields = [
    "machine_date_of_purchase",
    "monitor_date_of_purchase",
    "date_of_issue",
    "warranty_end_date",
    "create_date",
    "change_date",
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (dateFields.includes(key)) {
      if (value === "null" || value === "N/A" || value === "" || value == null) {
        updates[key] = null;
      } else {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(value)) {
          return res.status(400).send(`Invalid date format for ${key}. Expected YYYY-MM-DD.`);
        }
        updates[key] = value;
      }
    }
  }

  console.log("Processed updates:", updates);

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
      .filter((col) => col.Type.includes("date") || col.Type.includes("DATE"))
      .map((col) => col.Field);
    let selectClause = "*";
    if (dateColumns.length > 0) {
      const formattedColumns = columns
        .map((col) => {
          if (dateColumns.includes(col.Field)) {
            return `DATE_FORMAT(${col.Field}, '%Y-%m-%d') AS ${col.Field}`;
          }
          return col.Field;
        })
        .join(", ");
      selectClause = formattedColumns;
    }

    const [rows] = await pool.query(
      `SELECT ${selectClause} FROM ${tableType} WHERE ${whereClause}`, whereValues
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
    res.status(500).send(`Error updating asset: ${error.message}`);
  }
});

// Asset history route
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

// Export Excel route
app.post("/export-excel", async (req, res) => {
  console.log("Entered /export-excel endpoint");
  console.log("Received payload size:", JSON.stringify(req.body).length, "bytes");
  console.log("Number of rows in payload:", req.body.data ? req.body.data.length : 0);
  console.log("Sample data (first row):", req.body.data ? JSON.stringify(req.body.data[0]) : "No data");
  const { data } = req.body;
  if (!data || data.length === 0) {
    console.log("Error: No data provided to export");
    return res.status(400).send("No data provided to export");
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Assets");

    // Define columns (excluding create/change fields)
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

    // Map column keys to display names
    const displayNames = columns.map((key) =>
      key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );

    // Set column headers at row 6
    worksheet.getRow(6).values = displayNames;
    worksheet.getRow(6).font = { bold: true };
    worksheet.getRow(6).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D3D3D3" },
    };

    // Define worksheet columns
    worksheet.columns = columns.map((key) => ({
      key,
      width: 10, // Initial width, will be adjusted
    }));

    // Add data starting at row 7
    data.forEach((row, index) => {
      const rowData = columns.reduce((acc, key) => {
        acc[key] = row[key] !== undefined ? row[key] : null;
        return acc;
      }, {});
      console.log(`Adding row ${index + 1}:`, rowData);
      const newRow = worksheet.addRow(rowData);
      newRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      newRow.commit();
    });

    // Adjust column widths based on content
    worksheet.columns.forEach((column, index) => {
      let maxLength = displayNames[index].length; // Start with header length
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = index < 2 ? Math.max(maxLength, 15) : Math.min(maxLength, 50);
    });

    // Add company logo in merged cells A1:B4
    const logoPath = path.join(__dirname, "..", "frontend", "media", "company-logo.png");
    console.log("Checking logo at:", logoPath);
    const lastColumn = columns.length;
    if (fs.existsSync(logoPath)) {
      const logoId = workbook.addImage({
        filename: logoPath,
        extension: "png",
      });
      worksheet.mergeCells(1, 1, 4, 2); // Merge A1:B4 for logo
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 150, height: 80 }, // Adjusted width for two columns
        editAs: "absolute",
      });
      worksheet.getColumn(1).width = Math.max(worksheet.getColumn(1).width || 15, 15);
      worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width || 15, 15);
      const logoCell = worksheet.getCell(1, 1);
      logoCell.value = null;
      logoCell.border = {
        top: { style: "none" },
        left: { style: "none" },
        bottom: { style: "thin" },
        right: { style: "none" },
      };
      logoCell.fill = null;
      logoCell.style = { font: {}, alignment: {}, protection: {} }; // Minimal styles
      console.log("Logo cell set in A1:B4");
    } else {
      console.warn("Logo file not found at:", logoPath);
    }

    // Add document details at top-right with borders
    const documentDetails = [
      "Document Number: ITD-F-003",
      "Revision Number: 02",
      "Effective From: 15-JUN-23",
      "Page Number: 01 of 01",
    ];
    const detailsColumn = lastColumn; // Place in the last column
    for (let row = 1; row <= 4; row++) {
      const cell = worksheet.getCell(row, detailsColumn);
      cell.value = documentDetails[row - 1];
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.font = { name: "Calibri", size: 11 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // Clear all borders and content for header rows (except logo, title, and document details)
    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= lastColumn; col++) {
        if ((col === 1 || col === 2) || col === detailsColumn) {
          continue; // Skip logo (A1:B4) and document details
        }
        const cell = worksheet.getCell(row, col);
        cell.value = null;
        cell.border = {
          top: { style: "none" },
          left: { style: "none" },
          bottom: { style: "none" }, // Will set bottom border later
          right: { style: "none" },
        };
        cell.fill = null;
        cell.style = { font: {}, alignment: {}, protection: {} }; // Minimal styles
      }
    }

    // Merge remaining cells for title (from column C to lastColumn-1, rows 1-4)
    const titleStartCol = 3; // Start at column C
    const titleEndCol = lastColumn - 1; // End before the document details column
    if (titleEndCol >= titleStartCol) {
      console.log(`Merging cells for title: C1 to ${String.fromCharCode(64 + titleEndCol)}4`);
      worksheet.mergeCells(1, titleStartCol, 4, titleEndCol);
      const titleCell = worksheet.getCell(1, titleStartCol);
      titleCell.value = "IT Inventory Management";
      titleCell.font = { name: "Calibri", size: 16, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
      titleCell.border = {
        top: { style: "none" },
        left: { style: "none" },
        bottom: { style: "none" }, // Will set bottom border later
        right: { style: "none" },
      };
      console.log("Title cell set:", titleCell.value, "at C1");
    } else {
      console.warn("Not enough columns to merge for title");
    }

    // Explicitly set bottom border for all cells in row 4
    for (let col = 1; col <= lastColumn; col++) {
      const cell = worksheet.getCell(4, col);
      cell.border = {
        top: cell.border?.top || { style: "none" },
        left: cell.border?.left || { style: "none" },
        bottom: { style: "thin" },
        right: cell.border?.right || { style: "none" },
      };
    }

    // Keep 5th row empty
    worksheet.getRow(5).height = 20;

    // Freeze first two columns
    const srNoIndex = columns.indexOf("sr_no");
    const usernameIndex = columns.indexOf("user_name");
    if (srNoIndex !== -1 && usernameIndex !== -1) {
      worksheet.views = [
        {
          state: "frozen",
          xSplit: 2,
          ySplit: 6,
          topLeftCell: "C7",
        },
      ];
    } else {
      console.warn("sr_no or user_name column not found; skipping freeze panes");
    }

    // Set dynamic filename with today's date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `system_inventory_${dateStr}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`
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

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});