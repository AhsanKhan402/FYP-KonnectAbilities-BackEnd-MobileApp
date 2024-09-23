const generateToken = require("../helpers/generateToken");
const verifyToken = require("../helpers/verifyToken");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");
const Post = require("../models/Post");
const Service = require("../models/Service");

module.exports = {
  async createSuperAdminUser(req, res) {
    try {
      const { username, email, password } = req.body;

      const existingUser = await Admin.findOne({
        $or: [{ email }],
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Admin with the provided email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new Admin({
        username,
        email,
        password: hashedPassword,
        isSuperAdmin: true,
      });
      const savedUser = await newUser.save();

      const data = generateToken(savedUser);

      res.status(200).json({ status: 200, data });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Create Admin User
  async createAdminUser(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      token = await verifyToken(token.split(" ")[1]);

      // Retrieve the admin user by ID from the token
      const adminUser = await Admin.findById(token.user.id);
      if (!adminUser) {
        return res.status(404).json({
          status: 404,
          error: "Admin user not found",
        });
      }
      // Check if the user is a Super Admin
      if (!adminUser.isSuperAdmin) {
        return res.status(403).json({
          status: 403,
          error: "Forbidden: Only Super Admins can create admin users",
        });
      }

      const { username, email, password } = req.body;

      // Check if all required fields are provided
      if (!username || !email || !password) {
        return res.status(400).json({
          status: 400,
          error:
            "Please provide all required fields: username, email, and password",
        });
      }

      // Check if the username or email already exists
      const existingUser = await Admin.findOne({
        $or: [{ username }, { email }],
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ status: 400, error: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdminUser = new Admin({
        username,
        email,
        password: hashedPassword,
        isSuperAdmin: false,
      });

      await newAdminUser.save();

      res
        .status(200)
        .json({ status: 200, message: "New admin created successfully" });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Generate and send OTP
  async sendOtp(req, res) {
    try {
      const { email, password } = req.body;

      const user = await Admin.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(404).json({ message: "Invalid password" });
      }

      // Generate a 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Set OTP and its expiration (5 minutes)
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
      await user.save();

      // Send OTP to the user's email
      const transporter = nodemailer.createTransport({
        service: "gmail", // Example using Gmail, use your preferred email service
        auth: {
          user: "doulatk742@gmail.com",
          pass: "spyg dclb vxzj okcp",
        },
      });

      const mailOptions = {
        from: "doulatk742@gmail.com",
        to: user.email,
        subject: "Your OTP Code",
        html: `Your OTP code is <b>${otp}</b>. It will expire in 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        status: 200,
        message: "OTP sent to your email",
        otpExpires: user.otpExpires,
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Admin Login
  async loginAdminUser(req, res) {
    try {
      const { email, otp, password } = req.body;

      const user = await Admin.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found or Invalid email " });
      }

      if (user.otp !== otp || Date.now() > user.otpExpires) {
        return res.status(404).json({ message: "Invalid or expired OTP" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(404).json({ message: "Invalid password" });
      }

      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const data = generateToken(user);

      res.json({ status: 200, data });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Update Admin Password
  async updateAdminPassword(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }
      const tokenData = await verifyToken(token.split(" ")[1]);
      const adminId = tokenData.user.id;

      const admin = await Admin.findById(adminId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Admin not found" });
      }

      const { currentPassword, newPassword } = req.body;

      // Check if the current password matches
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ status: 400, message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      admin.password = hashedPassword;
      await admin.save();

      return res
        .status(200)
        .json({ status: 200, message: "Password updated successfully" });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get all users
  async getUsers(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const users = await User.find({});

      // Calculate followers count for each user
      const userData = await Promise.all(
        users.map(async (user) => {
          const followersCount = await User.countDocuments({
            "followStatus.userId": user._id,
            "followStatus.followed": true,
          });

          const userObject = user.toObject();
          return {
            ...userObject,
            followersCount,
          };
        })
      );

      return res.status(200).send({ status: 200, data: userData });
    } catch (error) {
      return res.status(500).send({ status: 500, message: error.message });
    }
  },

  // Get a single user by userId
  async getUserById(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const { userId } = req.query;

      const user = await User.findById(userId).select("-password"); // Exclude password

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      return res.status(200).json({ status: 200, data: user });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Update isVerified status
  async updateUserVerificationStatus(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const { userId } = req.query;
      const { isVerified } = req.body; // Expecting isVerified status in the body

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      user.isVerified = isVerified;
      await user.save();

      return res.status(200).json({
        status: 200,
        message: "User verification status updated successfully",
      });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Delete a user by admin
  async deleteUser(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const { userId } = req.query;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      await User.deleteOne({ _id: userId });

      return res
        .status(200)
        .json({ status: 200, message: "User deleted successfully" });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get all posts with user details, total comments, likes, and shares
  async getAllPosts(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const posts = await Post.find()
        .populate("userInfo", "username profileImage city") // Populate user details
        .populate("comments.userInfo", "username profileImage"); // Populate comment user details

      const formattedPosts = posts.map((post) => ({
        postId: post._id, // Explicitly include the post ID
        userInfo: post.userInfo,
        description: post.description,
        image: post.image,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        totalComments: post.comments.length,
        totalLikes: post.likes.length,
        totalShares: post.shares.length,
      }));

      return res.status(200).send({ status: 200, data: formattedPosts });
    } catch (error) {
      return res.status(500).send({ status: 500, message: error.message });
    }
  },

  // Delete a post by admin
  async deletePost(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const { postId } = req.query;
      console.log("POSTID", postId);
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({ status: 404, message: "Post not found" });
      }

      await Post.deleteOne({ _id: postId });

      return res
        .status(200)
        .json({ status: 200, message: "Post deleted successfully" });
    } catch (error) {
      console.log("ERROR", error);
      return res.status(500).json({ status: 500, error: error.message });
    }
  },

  // Get all services
  async getAllServices(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const services = await Service.find().populate(
        "userId",
        "username email phoneNumber"
      ); // Populate user details

      const formattedServices = services.map((service) => ({
        serviceId: service._id, // Explicitly include the service ID
        userId: service.userId._id,
        username: service.userId.username,
        email: service.userId.email,
        phoneNumber: service.userId.phoneNumber,
        title: service.title,
        pickLocation: service.pickLocation,
        dropLocation: service.dropLocation,
        date: service.date,
        time: service.time,
        description: service.description,
        status: service.status,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      }));

      return res.status(200).send({ status: 200, data: formattedServices });
    } catch (error) {
      return res.status(500).send({ status: 500, message: error.message });
    }
  },

  // Update service status by admin
  async updateServiceStatus(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, message: "Only admin can access this." });
      }

      const { serviceId, status } = req.body;

      if (!serviceId || !status) {
        return res
          .status(400)
          .json({ status: 400, message: "Service ID and status are required" });
      }

      const validStatuses = ["pending", "accepted", "canceled", "completed"];
      if (!validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ status: 400, message: "Invalid status value" });
      }

      const service = await Service.findById(serviceId);

      if (!service) {
        return res
          .status(404)
          .json({ status: 404, message: "Service not found" });
      }

      service.status = status;
      await service.save();

      return res.status(200).json({ status: 200, message: "Status updated" });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Delete a service by admin
  async deleteService(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);
      const loggedInUserId = tokenData.user.id;

      const admin = await Admin.findById(loggedInUserId);

      if (!admin) {
        return res
          .status(404)
          .json({ status: 404, error: "Only admin can access this." });
      }

      const { serviceId } = req.query;

      const service = await Service.findById(serviceId);

      if (!service) {
        return res
          .status(404)
          .json({ status: 404, error: "Service not found" });
      }

      await Service.deleteOne({ _id: serviceId });

      return res
        .status(200)
        .json({ status: 200, message: "Service deleted successfully" });
    } catch (error) {
      return res.status(500).json({ status: 500, error: error.message });
    }
  },
};
