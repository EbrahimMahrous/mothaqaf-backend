const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "الاسم مطلوب"], trim: true },
    email: {
      type: String,
      required: [true, "الإيميل مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "صيغة الإيميل غير صحيحة"],
    },
    password: {
      type: String,
      required: [true, "الباسورد مطلوب"],
      minlength: [6, "الباسورد لازم 6 حروف على الأقل"],
      select: false,
    },
    role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
  },
  { timestamps: true },
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
