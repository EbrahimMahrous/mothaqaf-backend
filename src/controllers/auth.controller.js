const Admin = require("../models/Admin");
const { signToken } = require("../utils/jwt");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "الإيميل والباسورد مطلوبين" });
    }
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin || !(await admin.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }
    const token = signToken({ id: admin._id, role: admin.role });
    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "الباسورد الحالي والجديد مطلوبين" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "الباسورد الجديد لازم 6 حروف على الأقل",
      });
    }
    const admin = await Admin.findById(req.admin._id).select("+password");
    if (!(await admin.comparePassword(currentPassword))) {
      return res
        .status(401)
        .json({ success: false, message: "الباسورد الحالي غلط" });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: "تم تغيير الباسورد بنجاح" });
  } catch (err) {
    next(err);
  }
};
