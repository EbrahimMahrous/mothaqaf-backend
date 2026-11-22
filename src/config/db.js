const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────
// Global connection cache for Vercel serverless
// Reuses the same connection across function invocations
// ─────────────────────────────────────────────────────────────

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected → reuse
  if (cached.conn) {
    return cached.conn;
  }

  // No promise yet → create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000, // 30s — Atlas from Egypt can be slow
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4, // force IPv4 (avoids IPv6 issues on some Windows networks)
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log(
          `✅ MongoDB Connected: ${mongooseInstance.connection.host}`,
        );
        return mongooseInstance;
      })
      .catch((err) => {
        console.error(`❌ MongoDB Error: ${err.message}`);
        cached.promise = null; // reset so next request can retry
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
