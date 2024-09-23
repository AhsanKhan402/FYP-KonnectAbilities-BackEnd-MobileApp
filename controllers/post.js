const bcrypt = require("bcrypt");
const verifyToken = require("../helpers/verifyToken");
const Post = require("../models/Post");
const User = require("../models/User");
const { uploadImage } = require("../helpers/cloudinary");

module.exports = {
  async getPosts(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      // Remove 'Bearer ' from the token string
      token = token.replace("Bearer ", "");

      // Verify the token using the verifyToken function
      const { status, user } = await verifyToken(token);
      if (status !== 200) {
        return res
          .status(status)
          .json({ status, message: "Unauthorized: Invalid token" });
      }

      const userId = user.id;

      const posts = await Post.find()
        .populate("userInfo")
        .populate({
          path: "likes",
          populate: {
            path: "userInfo",
            select: "username profileImage", // Populate likes with username and profileImage of the users who liked
          },
        })
        .populate({
          path: "shares",
          populate: {
            path: "userInfo",
            select: "username profileImage", // Populate shares with username and profileImage of the users who shared
          },
        })
        .populate({
          path: "comments",
          select: "text userInfo",
          populate: {
            path: "userInfo",
            select: "username profileImage", // Populate comments with text and userInfo fields
          },
        });

      // Transform the data to include counts and postLiked status
      const transformedData = posts.map((post) => {
        const postLiked = post.likes.some(
          (like) => like.userInfo._id.toString() === userId
        );

        return {
          _id: post._id,
          description: post.description,
          image: post.image,
          userInfo: post.userInfo,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likesCount: post.likes.length,
          sharesCount: post.shares.length,
          commentsCount: post.comments.length,
          postLiked: postLiked, // True if the logged-in user liked this post
          likes: post.likes.map((like) => ({
            userInfo: like.userInfo, // Include details of users who liked the post
          })),
          shares: post.shares.map((share) => ({
            userInfo: share.userInfo, // Include details of users who shared the post
          })),
          comments: post.comments.map((comment) => ({
            text: comment.text,
            userInfo: comment.userInfo, // Include details of users who commented
          })),
        };
      });

      return res.status(200).send({ status: 200, data: transformedData });
    } catch (error) {
      return res.status(500).send({ status: 500, error: error.message });
    }
  },

// GET login user followed posts
async getFollowedUsersPosts(req, res) {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return res
        .status(401)
        .json({ status: 401, message: "Unauthorized: No token provided" });
    }

    // Remove 'Bearer ' from the token string
    token = token.replace("Bearer ", "");

    // Verify the token using the verifyToken function
    const { status, user } = await verifyToken(token);
    if (status !== 200) {
      return res
        .status(status)
        .json({ status, message: "Unauthorized: Invalid token" });
    }

    const userId = user.id;

    // Find all users where the logged-in user is in their followStatus array
    const followedUsers = await User.find({
      "followStatus.userId": userId, // This finds users that the logged-in user is following
      "followStatus.followed": true,
    }).select("_id");

    // Extract the IDs of the users followed by the logged-in user
    const followedUserIds = followedUsers.map((user) => user._id.toString());

    // Include the logged-in user's own posts
    followedUserIds.push(userId);

    // Query for the logged-in user's posts and the posts of the users they follow
    const posts = await Post.find({
      userInfo: { $in: followedUserIds },
    })
      .populate("userInfo", "")
      .populate({
        path: "likes",
        select: "username profileImage",
      })
      .populate({
        path: "shares.userInfo",
        select: "username profileImage",
      })
      .populate({
        path: "comments",
        select: "text userInfo",
        populate: {
          path: "userInfo",
          select: "username profileImage", // Populate comments with text and userInfo fields
        },
      });

    return res.status(200).send({ status: 200, data: posts });
  } catch (error) {
    console.log("Error:", error.message);
    return res.status(500).send({ status: 500, message: error.message });
  }
}
,

  // POST like on post
  async likePost(req, res) {
    try {
      const token = req.header("Authorization").replace("Bearer ", "");
      const { status, user } = await verifyToken(token);

      if (status !== 200) {
        return res
          .status(status)
          .json({ status, message: "Unauthorized: Invalid token" });
      }

      const { postId } = req.body;
      console.log("posddd", postId, user.id, status);
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({ status: 404, message: "Post not found" });
      }

      // Check if the user already liked the post
      const alreadyLiked = post.likes.some(
        (like) => like.toString() === user.id
      );
      if (alreadyLiked) {
        return res
          .status(400)
          .json({ status: 400, message: "You have already liked this post" });
      }

      // Add like (just push the user.id, not an object)
      post.likes.push(user.id);
      await post.save();

      return res
        .status(200)
        .json({ status: 200, message: "Post liked successfully" });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // POST comennt on post
  async commentOnPost(req, res) {
    try {
      const token = req.header("Authorization").replace("Bearer ", "");
      const { status, user } = await verifyToken(token);

      if (status !== 200) {
        return res
          .status(status)
          .json({ status, error: "Unauthorized: Invalid token" });
      }

      const { postId, text } = req.body;
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({ status: 404, error: "Post not found" });
      }

      // Add comment
      post.comments.push({ userInfo: user.id, text });
      await post.save();

      return res
        .status(200)
        .json({ status: 200, message: "Comment added successfully" });
    } catch (error) {
      console.log("posddd", error.message);
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // POST share a post
  async sharePost(req, res) {
    try {
      const token = req.header("Authorization").replace("Bearer ", "");
      const { status, user } = await verifyToken(token);

      if (status !== 200) {
        return res
          .status(status)
          .json({ status, message: "Unauthorized: Invalid token" });
      }

      const { postId } = req.body;
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({ status: 404, message: "Post not found" });
      }

      // Check if the user already shared the post
      const alreadyShared = post.shares.some(
        (share) => share.toString() === user.id
      );
      if (alreadyShared) {
        return res
          .status(400)
          .json({ status: 400, message: "You have already shared this post" });
      }

      // Add share
      post.shares.push(user.id);
      await post.save();

      return res
        .status(200)
        .json({ status: 200, message: "Post shared successfully" });
    } catch (error) {
      return res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get post by Id
  async getPostById(req, res) {
    try {
      const { postId } = req.query;
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }
      if (token) {
        token = await verifyToken(token.split(" ")[1]);

        const post = await Post.findById(postId).populate("userInfo");
        if (!post) {
          return res
            .status(404)
            .json({ status: 404, message: "Post data not found" });
        }

        res.status(200).json({ status: 200, data: post });
      } else {
        return res
          .status(401)
          .send({ status: 401, data: "Please provide valid auth token" });
      }
    } catch (error) {
      console.error("Error retrieving user:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get posts by user Id
  async getPostsByUserId(req, res) {
    try {
      const { userId } = req.query;
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      // Verify the token
      token = await verifyToken(token.split(" ")[1]);

      if (token.status !== 200) {
        return res
          .status(token.status)
          .send({ status: token.status, message: "Invalid token" });
      }

      const loggedInUserId = token.user.id;

      // Find posts created by the user or shared by the user
      const posts = await Post.find({
        $or: [{ userInfo: userId }, { "shares.userInfo": userId }],
      })
        .populate("userInfo", "")
        .populate({
          path: "likes",
          select: "username profileImage",
        })
        .populate({
          path: "shares",
          select: "username profileImage", // Populate shares with username and profileImage of the users who shared
        })
        .populate({
          path: "comments",
          select: "text userInfo",
          populate: {
            path: "userInfo",
            select: "username profileImage ",
          },
        });

      if (!posts || posts.length === 0) {
        return res
          .status(404)
          .json({ status: 404, message: "Posts not found", data: null });
      }

      // Transform the data to include counts, postLiked status, and shared post indication
      const transformedData = posts.map((post) => {
        const postLiked = post.likes.some(
          (like) => like._id.toString() === loggedInUserId
        );

        const sharedByUser = post.shares.some(
          (share) => share._id.toString() === userId
        );

        const sharedPostOwner = sharedByUser ? post.userInfo : null;

        return {
          _id: post._id,
          description: post.description,
          image: post.image,
          userInfo: post.userInfo,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likesCount: post.likes.length,
          sharesCount: post.shares.length,
          commentsCount: post.comments.length,
          postLiked: postLiked,
          sharedByUser: sharedByUser,
          sharedPostOwner: sharedPostOwner,
          likes: post.likes.map((like) => ({
            userInfo: like,
          })),
          shares: post.shares.map((share) => ({
            userInfo: share,
          })),
          comments: post.comments.map((comment) => ({
            text: comment.text,
            userInfo: comment.userInfo,
          })),
        };
      });

      res.status(200).json({ status: 200, data: transformedData });
    } catch (error) {
      console.error("Error retrieving posts by user ID:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Create Post
  async addPost(req, res) {
    try {
      const { description, image } = req.body;
      const token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized: No token provided" });
      }
      if (!description) {
        return res.status(400).json({ message: "Description are required" });
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

      const imgUrl = await uploadImage(image);

      const newPost = new Post({ description, image: imgUrl, userInfo });
      await newPost.save();

      res.status(200).json({
        status: 200,
        data: newPost,
        message: "Post Upload Successfully",
      });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Update Post by id
  async updatePost(req, res) {
    try {
      const { id, description, image } = req.body;
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized: No token provided" });
      }
      token = await verifyToken(token.split(" ")[1]);

      const post = await Post.findById(id).populate("userInfo");
      if (!post) {
        return res.status(404).json({ message: "Post data not found" });
      }
      const imgUrl = await uploadImage(image);

      if (description) post.description = description;
      if (image) post.image = imgUrl;

      await post.save();

      res.status(200).json({ status: 200, data: post });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },
};
