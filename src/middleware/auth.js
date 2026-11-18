const { verifyToken } = require("../utils/jwt");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "غير مصرح، لازم تسجل دخول" });
    }
    const decoded = verifyToken(token);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "المستخدم غير موجود" });
    }
    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
};

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res
        .status(403)
        .json({ success: false, message: "مالكش صلاحية للعملية دي" });
    }
    next();
  };

module.exports = { protect, restrictTo };
