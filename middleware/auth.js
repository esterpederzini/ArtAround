const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "artaround-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

function createAuthToken(user) {
  const role = user.role || user.ruolo;
  return jwt.sign(
    { sub: String(user._id), role, ruolo: role, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      data: null,
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      data: null,
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.auth?.role || req.auth?.ruolo;
    if (!req.auth || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        data: null,
      });
    }
    return next();
  };
}

module.exports = { createAuthToken, requireAuth, requireRole };
