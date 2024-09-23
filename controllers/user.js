const { Types } = require("mongoose");
const generateToken = require("../helpers/generateToken");
const bcrypt = require("bcrypt");
const verifyToken = require("../helpers/verifyToken");
const User = require("../models/User");
const { uploadImage, uploadFile } = require("../helpers/cloudinary");

module.exports = {
  async getUsers(req, res) {
    try {
      const userData = await User.find({});
      return res.status(200).send({ status: 200, userData });
    } catch (error) {
      return res.status(500).send({ status: 500, error: error.message });
    }
  },

  // async getUserById(req, res) {
  //   try {
  //     const {userId} = req.query;
  //     let token = req.header("Authorization");

  //     if (!token) {
  //       return res
  //         .status(401)
  //         .json({ status: 401, error: "Unauthorized: No token provided" });
  //     }
  //     if (token) {
  //       token = await verifyToken(token.split(" ")[1]);

  //       const user = await User.findById(userId);
  //       if (!user) {
  //         return res.status(404).json({ status: 404, error: "User not found" });
  //       }

  //       res.status(200).json({ status: 200, data: user });
  //     } else {
  //       return res
  //         .status(401)
  //         .send({ status: 401, data: "Please provide valid auth token" });
  //     }
  //   } catch (error) {
  //     console.error("Error retrieving user:", error);
  //     res.status(500).json({ status: 500, message: error.message });
  //   }
  // },

  // Get user by Id
  async getUserById(req, res) {
    try {
      const { userId } = req.query;
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      const tokenData = await verifyToken(token.split(" ")[1]);

      if (tokenData.status !== 200) {
        return res
          .status(tokenData.status)
          .json({ status: tokenData.status, message: "Invalid token" });
      }

      const loggedInUserId = tokenData.user.id;

      // Find the user by the provided userId
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      // Check if the logged-in user is following this user
      const isFollowing = user.followStatus.some(
        (follow) =>
          follow.userId.toString() === loggedInUserId &&
          follow.followed === true
      );

      // Include the isFollowing status in the response
      const userData = {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        city: user.city,
        disability: user.disability,
        isVerified: user.isVerified,
        // verificationImage: user.verificationImage,
        // verificationDescription: user.verificationDescription,
        isFollowing: isFollowing, // True if the logged-in user is following this user
      };

      res.status(200).json({ status: 200, data: userData });
    } catch (error) {
      console.error("Error retrieving user:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Login
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const data = generateToken(user);

      res.json({ status: 200, data });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Sign Up
  async signUpUser(req, res) {
    try {
      const { username, email, password } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }],
      });

      if (existingUser) {
        return res.status(400).json({
          message: "User with the provided email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });
      const savedUser = await newUser.save();

      const data = generateToken(savedUser);

      res.status(200).json({ status: 200, data });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Update User by token id
  async updateUser(req, res) {
    try {
      const { profileImage, bio, phoneNumber, dateOfBirth, city, disability } =
        req.body;
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

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const imgUrl = await uploadImage(profileImage);

      // Update user fields
      if (profileImage) user.profileImage = imgUrl;
      if (bio) user.bio = bio;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (city) user.city = city;
      if (disability) user.disability = disability;

      // Save the updated user
      await user.save();

      res
        .status(200)
        .json({ status: 200, data: user, message: "Data Update Successfully" });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  async getUserMe(req, res) {
    const token = req.header("Authorization");
    console.log(token);

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
      const decoded = await verifyToken(token.split(" ")[1]);
      console.log("as", decoded);

      const user = await User.findOne({ _id: decoded.user.id });

      if (user) {
        return res.status(200).json({
          status: 200,
          data: user,
          message: "User found",
        });
      } else {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  },

  // POST for follow and unfollow user
  async followUnfollowUser(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      // Verify the token and extract the user ID of the logged-in user
      const tokenData = await verifyToken(token.split(" ")[1]);

      if (tokenData.status !== 200) {
        return res
          .status(tokenData.status)
          .json({ status: tokenData.status, message: "Invalid token" });
      }

      const loggedInUserId = tokenData.user.id;
      const { userId } = req.body; // The ID of the user to follow/unfollow

      if (loggedInUserId === userId) {
        return res
          .status(400)
          .json({
            status: 400,
            message: "You cannot follow/unfollow yourself",
          });
      }

      // Find the user to be followed/unfollowed
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      // Check if the logged-in user is already following this user
      const followIndex = user.followStatus.findIndex(
        (follow) => follow.userId.toString() === loggedInUserId
      );

      if (followIndex !== -1) {
        // If already following, toggle to unfollow
        user.followStatus[followIndex].followed =
          !user.followStatus[followIndex].followed;
      } else {
        // If not following, add the logged-in user's ID to the followStatus array
        user.followStatus.push({ userId: loggedInUserId, followed: true });
      }

      // Save the user with the updated follow status
      await user.save();

      const message = user.followStatus[followIndex]?.followed
        ? "User followed successfully"
        : "User unfollowed successfully";

      return res.status(200).json({ status: 200, message });
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get search user by username
  async searchUsersByUsername(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      // Verify the token
      const tokenData = await verifyToken(token.split(" ")[1]);

      if (tokenData.status !== 200) {
        return res
          .status(tokenData.status)
          .json({ status: tokenData.status, message: "Invalid token" });
      }

      const { username } = req.query;

      if (!username) {
        return res
          .status(400)
          .json({
            status: 400,
            message: "Username query parameter is required",
          });
      }

      // Find users whose usernames match or partially match the provided query string
      const users = await User.find({
        username: { $regex: username, $options: "i" },
      }).select(""); // Select fields to return

      if (users.length === 0) {
        return res
          .status(200)
          .json({ status: 200, data: users, message: "No users found" });
      }

      res.status(200).json({ status: 200, data: users });
    } catch (error) {
      console.error("Error searching for users by username:", error);
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // POST the user verify
  async verifyUser(req, res) {
    try {
      let token = req.header('Authorization');
      if (!token) {
        return res.status(401).json({ status: 401, message: 'Unauthorized: No token provided' });
      }
  
      token = token.replace('Bearer ', '');
      const { status, user } = await verifyToken(token);
      if (status !== 200) {
        return res.status(status).json({ status, message: 'Unauthorized: Invalid token' });
      }
  
      const userId = user.id;
      const { description, base64MedicalReport } = req.body;
  
      if (!description || !base64MedicalReport) {
        return res.status(400).json({ status: 400, message: 'Description and medical report are required.' });
      }
  
      const pdfUrl = await uploadFile(base64MedicalReport, 'medical_reports');
  
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          verificationDescription: description,
          verificationFile: pdfUrl, // You may rename this to verificationFileUrl for clarity
          isVerified: 'verify request',
        },
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ status: 404, message: 'User not found' });
      }
  
      return res.status(200).json({ status: 200, message: 'Verification request submitted successfully', data: updatedUser });
    } catch (error) {
      console.error('Error during verification:', error);
      return res.status(500).json({ status: 500, message: 'Internal Server Error' });
    }
  },
};
