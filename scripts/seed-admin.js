require("dotenv").config();
const connectDB = require("../src/config/db");
const Admin = require("../src/models/Admin");

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error("❌ لازم تحدد ADMIN_EMAIL و ADMIN_PASSWORD في .env");
      process.exit(1);
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log(`⚠️  الأدمن موجود بالفعل: ${email}`);
      process.exit(0);
    }

    const admin = await Admin.create({
      name: "Admin",
      email,
      password,
      role: "superadmin",
    });
    console.log("✅ تم إنشاء الأدمن:");
    console.log(`   Email: ${admin.email}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ خطأ:", err.message);
    process.exit(1);
  }
};

seedAdmin();
