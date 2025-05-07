const express = require("express");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const ExcelJS = require("exceljs");
const cors = require("cors");
const fs = require("fs");

const app = express();
const port = 3000;

// Middleware to parse JSON, handle CORS, and serve static files
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

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
  password: "yourpassword", // Ensure this is your correct password
  database: "inventory_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database");
    connection.release();
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1); // Exit the process if the database connection fails
  }
})();

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route to fetch columns for a specific table
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

// Route to fetch data for a specific table
app.get("/fetchData/:tableType", async (req, res) => {
  const { tableType } = req.params;
  try {
    console.log(`Fetching data for table: ${tableType}`);
    const [rows] = await pool.query(`SELECT * FROM ${tableType}`);
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching data for ${tableType}:`, error);
    console.error("Full error details:", error);
    res.status(500).send("Error fetching data");
  }
});

// Route to add a new asset with file upload
app.post("/assets", upload.single("invoice_file"), async (req, res) => {
  const { tableType, ...assetData } = req.body;
  const invoiceFile = req.file ? `uploads/${req.file.filename}` : null;

  if (invoiceFile) {
    assetData.invoice_file = invoiceFile;
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

// Route to update an asset by key and log changes to asset_history
app.post("/assets/updateByKey", async (req, res) => {
  const { tableType, key, updates } = req.body;
  console.log(`Received update request for tableType: ${tableType}, key:`, key);
  console.log("Fields to update:", updates);

  if (!updates || Object.keys(updates).length === 0) {
    console.log("No fields to update, returning early");
    return res.status(400).send("No fields to update");
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
    // Fetch the current asset data before updating
    const [rows] = await pool.query(
      `SELECT * FROM ${tableType} WHERE ${whereClause}`,
      whereValues
    );
    if (rows.length === 0) {
      console.log("Asset not found for update");
      return res.status(404).send("Asset not found");
    }
    const currentAsset = rows[0];
    console.log("Current asset data before update:", currentAsset);

    // Update the asset
    const updateQuery = `UPDATE ${tableType} SET ${setClause}, change_date = CURDATE(), change_time = CURTIME(), change_user = 'admin' WHERE ${whereClause}`;
    console.log("Executing update query:", updateQuery);
    console.log("Update values:", [...values, ...whereValues]);
    const [result] = await pool.query(updateQuery, [...values, ...whereValues]);
    if (result.affectedRows === 0) {
      console.log("No rows affected by update");
      return res.status(404).send("Asset not found");
    }

    // Log changes to asset_history
    const changeUser = "admin"; // Replace with actual user if authentication is implemented
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentAsset[field] || null;
      // Normalize values for comparison (treat null and empty string as equivalent)
      const normalizedOldValue = oldValue === null ? "" : oldValue.toString();
      const normalizedNewValue = newValue === null ? "" : newValue.toString();
      console.log(`Comparing field ${field}: oldValue="${normalizedOldValue}", newValue="${normalizedNewValue}"`);

      if (normalizedOldValue !== normalizedNewValue) {
        console.log(`Field ${field} changed, logging to asset_history`);
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
        console.log("Logging to asset_history with values:", historyValues);
        await pool.query(historyQuery, historyValues);
      } else {
        console.log(`Field ${field} unchanged, skipping history log`);
      }
    }

    console.log("Asset updated successfully");
    res.json({ message: "Asset updated successfully" });
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).send("Error updating asset");
  }
});

// Route to fetch asset history using POST request with parameters in the body
app.post("/assetHistory", async (req, res) => {
  console.log("Received POST request to /assetHistory");
  console.log("Request body:", req.body);

  const { tableType, sr_no, machine_asset_tag, monitor_asset_tag, asset_tag } = req.body;

  // Validate required parameters
  if (!tableType || !sr_no) {
    console.log("Error: tableType or sr_no is missing");
    return res.status(400).json({ error: "tableType and sr_no are required" });
  }

  try {
    // Build the query
    let query = `
      SELECT id, field_name, old_value, new_value, changed_by, change_date, change_time
      FROM asset_history
      WHERE table_type = ?
        AND sr_no = ?
    `;
    let values = [tableType, sr_no];
    console.log("SQL query being executed:", query);
    console.log("Values being passed:", values);

    if (tableType.toLowerCase() === "systems") {
      if (!machine_asset_tag || !monitor_asset_tag) {
        console.log("Error: machine_asset_tag or monitor_asset_tag is missing for tableType 'systems'");
        return res.status(400).json({ error: "machine_asset_tag and monitor_asset_tag are required for tableType 'systems'" });
      }
      query += ` AND machine_asset_tag = ? AND monitor_asset_tag = ?`;
      values.push(machine_asset_tag, monitor_asset_tag);
      console.log("Updated query for systems:", query);
      console.log("Updated values for systems:", values);
    } else {
      if (!asset_tag) {
        console.log("Error: asset_tag is missing for non-systems tableType");
        return res.status(400).json({ error: "asset_tag is required for non-systems tableType" });
      }
      query += ` AND asset_tag = ?`;
      values.push(asset_tag);
      console.log("Updated query for non-systems:", query);
      console.log("Updated values for non-systems:", values);
    }

    query += ` ORDER BY change_date DESC, change_time DESC`;
    console.log("Final query to execute:", query);
    console.log("Final values to pass:", values);

    // Execute the query
    const [rows] = await pool.query(query, values);
    console.log("Query executed, rows retrieved:", rows);

    res.json({ history: rows });
    console.log("Response sent with history data");
  } catch (error) {
    console.log("Error executing query:", error);
    res.status(500).json({ error: "Error fetching asset history" });
  }
});

// Route to export selected rows to Excel using exceljs
app.post("/export-excel", async (req, res) => {
  console.log("Received export-excel request with data:", req.body.data);
  const { data } = req.body;

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error("Invalid or empty data received for export");
    return res.status(400).send("Invalid or empty data for export");
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory");

    const excludedFields = [
      "create_user",
      "create_time",
      "create_date",
      "change_user",
      "change_time",
      "change_date",
    ];

    const allColumns = [
      ...new Set(data.flatMap((item) => Object.keys(item))),
    ].filter((column) => !excludedFields.includes(column));

    const formatColumnName = (column) => {
      const words = column.replace(/_/g, " ").split(" ");
      return words
        .map((word, index) => {
          if (index !== 0 && word.toLowerCase() === "of") {
            return word.toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
    };
    const headers = allColumns.map((column) => formatColumnName(column));

    const invoiceFileIndex = allColumns.indexOf("invoice_file");
    const invoiceFileHeaderIndex =
      invoiceFileIndex !== -1 ? invoiceFileIndex : allColumns.length - 1;

    const wsData = data.map((item) => {
      return allColumns.map((column) => {
        const value = item[column] || "";
        if (column === "invoice_file" && value) {
          return value.split("/").pop();
        }
        return value;
      });
    });

    const logoPath = path.join(
      __dirname,
      "../frontend/media/company-logo.png"
    );
    console.log("__dirname is:", __dirname);
    console.log("Attempting to find logo at:", logoPath);
    console.log("Does path exist?", fs.existsSync(logoPath));

    let logoId;
    if (fs.existsSync(logoPath)) {
      console.log("Company logo found, adding to Excel");
      logoId = workbook.addImage({
        filename: logoPath,
        extension: "png",
      });
      worksheet.mergeCells("A1:Z4");
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 150, height: 100 },
      });
      worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    } else {
      console.warn(
        "Company logo not found at",
        logoPath,
        "adding placeholder text instead"
      );
      worksheet.getCell("A1").value = "Company Logo Placeholder";
      worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    }

    const titleCell = worksheet.getCell("E1");
    titleCell.value = "IT Inventory Management";
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const docDetails = [
      ["Document Number", "ITD-F-003"],
      ["Effective From", "15-Jun-23"],
      ["Page Number", "01 of 01"],
    ];
    const docStartCol = invoiceFileHeaderIndex + 2;
    docDetails.forEach((detail, index) => {
      const row = worksheet.getRow(2 + index);
      const keyCell = row.getCell(docStartCol + 2);
      const valueCell = row.getCell(docStartCol + 2);
      keyCell.value = detail[0];
      valueCell.value = detail[1];
      keyCell.alignment = { horizontal: "right" };
      valueCell.alignment = { horizontal: "left" };
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    const startRow = 6;
    const headerRow = worksheet.getRow(startRow);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D3D3D3" },
      };
      cell.border = {
        top: { style: "thin Ascending" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    wsData.forEach((rowData, rowIndex) => {
      const row = worksheet.getRow(startRow + 1 + rowIndex);
      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    worksheet.views = [
      {
        state: "frozen",
        xSplit: 1,
        ySplit: startRow,
      },
    ];

    allColumns.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = 20;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = String(today.getFullYear()).slice(-2);
    const fileName = `System_Inventory_${day}_${month}_${year}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).send("Error generating Excel file");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});