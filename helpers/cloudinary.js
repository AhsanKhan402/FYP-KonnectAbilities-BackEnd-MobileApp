const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "drsfkzh77",
  api_key: "671119513592783",
  api_secret: "8yfFu0MAYwv4sjP9PTep5QL8rwQ",
});
async function uploadImage(base64Data, folderName) {
  try {
    const result = await cloudinary.uploader.upload(base64Data);
    return result.url;
  } catch (error) {
    console.log(error);
  }
}

async function uploadFile(base64Data, folderName) {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      resource_type: "auto",
      folder: folderName,
    });
    return result.url;
  } catch (error) {
    console.log("Error uploading file to Cloudinary:", error);
    throw error;
  }
}

module.exports = { uploadImage, uploadFile };
