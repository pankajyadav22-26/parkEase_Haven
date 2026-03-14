const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, message: "Token is not valid or has expired!" });

      req.user = user; 

      next();          

    });
  } else {
    return res.status(401).json({ success: false, message: "You are not authenticated! Missing Bearer token." });
  }
};

const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAdmin) {
      next(); 

    } else {
      res.status(403).json({ success: false, message: "Access Denied: You do not have admin privileges!" });
    }
  });
};

module.exports = { verifyToken, verifyTokenAndAdmin };