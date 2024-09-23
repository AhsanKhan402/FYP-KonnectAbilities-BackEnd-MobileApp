const jwt = require("jsonwebtoken");

const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject({ status: 404, message: "No token provided" });
    }

    jwt.verify(token, "secret", (err, decoded) => {
      if (err) {
        console.error(err);
        reject({ status: 404, message: err.message });
      } else {
        resolve({ status: 200, user: decoded });
      }
    });
  });
};

module.exports = verifyToken;
