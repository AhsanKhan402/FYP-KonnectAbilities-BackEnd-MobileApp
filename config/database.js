const mongoose = require("mongoose");

const connection = mongoose
  .createConnection("mongodb://localhost:27017/konnect")
  .on("open", () => {
    console.log("Connected to the database");
  })
  .on("error", (err) => {
    console.error("Error connecting to the database:", err);
  });

module.exports = connection;
 