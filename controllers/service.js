const verifyToken = require("../helpers/verifyToken");
const User = require("../models/User");
const Service = require("../models/Service");

module.exports = {
  // Create a new service request
  async addService(req, res) {
    try {
      const {
        title,
        pickLocation,
        dropLocation,
        date,
        time,
        phoneNumber,
        description,
      } = req.body;
      const token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized: No token provided" });
      }

      if (
        !title ||
        !pickLocation ||
        !dropLocation ||
        !date ||
        !time ||
        !phoneNumber
      ) {
        return res
          .status(400)
          .json({ message: "All required fields must be provided" });
      }

      const decoded = await verifyToken(token.split(" ")[1]);
      const userId = decoded.user.id;

      if (!userId) {
        return res.status(400).json({ message: "Invalid token" });
      }

      const userInfo = await User.findById(userId);
      if (!userInfo) {
        return res.status(404).json({ message: "User not found" });
      }

      const newService = new Service({
        userId,
        title,
        pickLocation,
        dropLocation,
        date,
        time,
        phoneNumber,
        description,
      });
      await newService.save();

      res.status(200).json({
        status: 200,
        data: newService,
        message: "Service request created successfully",
      });
    } catch (error) {
      console.error("Error creating service request:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get services by logged-in user's ID
  async getServices(req, res) {
    try {
      const token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized: No token provided" });
      }

      const decoded = await verifyToken(token.split(" ")[1]);
      const userId = decoded.user.id;

      if (!userId) {
        return res.status(400).json({ message: "Invalid token" });
      }

      const services = await Service.find({ userId });

      if (!services.length) {
        return res
          .status(404)
          .json({ status: 404, message: "No services found for this user" });
      }

      res.status(200).json({
        status: 200,
        data: services,
        message: "Services retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },
};
