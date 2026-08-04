const cloudinary = require("cloudinary").v2;

// Using 3 separate env vars instead of one CLOUDINARY_URL string —
// avoids copy-paste formatting issues with the special characters (: and @)
// that a single URL string requires.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;