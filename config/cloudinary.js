const cloudinary = require("cloudinary").v2;

// Cloudinary's SDK automatically reads the CLOUDINARY_URL environment
// variable (set on Render) — no manual config needed here.

// --- TEMPORARY DEBUG LOGGING (remove once the issue is fixed) ---
console.log("=== CLOUDINARY DEBUG ===");
console.log("typeof cloudinary:", typeof cloudinary);
console.log("cloudinary keys:", cloudinary ? Object.keys(cloudinary) : "N/A");
console.log("typeof cloudinary.uploader:", typeof cloudinary?.uploader);
console.log("CLOUDINARY_URL is set:", !!process.env.CLOUDINARY_URL);
console.log("current config:", cloudinary?.config ? cloudinary.config() : "no config fn");
console.log("========================");

module.exports = cloudinary;