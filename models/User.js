const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["author", "visitor", "admin"],
      default: "visitor",
    },
    museum: {
      type: String,
      default: null,
    },
    purchases: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        purchaseDate: { type: Date, default: Date.now },
        price: { type: Number, default: 0 },
      },
    ],
    savedVisits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Visit" }],
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password && this.password.startsWith("$2")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema, "users");
