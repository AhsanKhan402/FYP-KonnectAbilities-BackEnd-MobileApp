const bcrypt = require("bcrypt");
const verifyToken = require("../helpers/verifyToken");
const Post = require("../models/Post");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");

module.exports = {
  async getChatroomByUserId(req, res) {
    try {
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      const decoded = await verifyToken(token.split(" ")[1]);
      const userId = decoded.user.id;

      // Filter chat rooms by user participation and isGroupChat = false
      const data = await ChatRoom.find({
        participants: userId,
        isGroupChat: false, // Only include non-group chats
      }).populate("participants");

      return res.status(200).send({ status: 200, data });
    } catch (error) {
      return res.status(500).send({ status: 500, error: error.message });
    }
  },

  // Get post by Id
  async getMessagesByChatroomId(req, res) {
    try {
      const { chatroomId } = req.query;
      let token = req.header("Authorization");

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }
      if (token) {
        token = await verifyToken(token.split(" ")[1]);

        const chat = await ChatRoom.findById(chatroomId)
          .populate("participants")
          .populate("messages")
          .populate("messages.sender");
        if (!chat) {
          return res
            .status(404)
            .json({ status: 404, message: "Chat room data not found" });
        }

        res.status(200).json({ status: 200, data: chat });
      } else {
        return res
          .status(401)
          .send({ status: 401, message: "Please provide valid auth token" });
      }
    } catch (error) {
      console.error("Error retrieving:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Create Post
  async createChatRoom(req, res) {
    try {
      let token = req.header("Authorization");
      const { participants } = req.body;

      if (!token) {
        return res
          .status(401)
          .send({ status: 401, data: "Please provide a valid auth token" });
      }

      token = await verifyToken(token.split(" ")[1]);

      const users = await User.find({ _id: { $in: participants } });
      if (users.length !== participants.length) {
        return res.status(400).json({
          status: 400,
          message: "One or more participants do not exist",
        });
      }

      // Check if a chat room with the same participants already exists
      const existingChatRoom = await ChatRoom.findOne({
        participants: { $all: participants, $size: participants.length },
        isGroupChat: false, // Ensure it checks only one-on-one chats, not group chats
      });

      if (existingChatRoom) {
        return res.status(200).json({
          status: 200,
          data: existingChatRoom,
          message: "Chat room with these participants already exists",
        });
      }

      // Create a new chat room if it doesn't exist
      const newChatRoom = new ChatRoom({ participants });
      await newChatRoom.save();

      res.status(200).json({ status: 200, data: newChatRoom });
    } catch (error) {
      console.error("Error during chat room creation:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Add a message to a chat room
  async addMessageToChatRoom(req, res) {
    try {
      let token = req.header("Authorization");
      const { chatRoomId, sender, content } = req.body;
      console.log("Check", chatRoomId, sender, content);

      if (token) {
        token = await verifyToken(token.split(" ")[1]);
        console.log("Check", chatRoomId, sender, content);
        const chatRoom = await ChatRoom.findById(chatRoomId);
        if (!chatRoom) {
          return res
            .status(404)
            .json({ status: 404, message: "Chat room not found" });
        }

        chatRoom.messages.push({ sender, content });
        await chatRoom.save();

        res.status(200).json({ status: 200, data: chatRoom });
      } else {
        return res
          .status(401)
          .send({ status: 401, message: "Please provide valid auth token" });
      }
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Create Group Chat
  async createGroupChat(req, res) {
    try {
      let token = req.header("Authorization");
      const { groupName, groupDescription, participants } = req.body;

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      // Verify the token and extract the user ID
      const verifiedToken = await verifyToken(token.split(" ")[1]);
      const groupAdmin = verifiedToken.user.id;

      // Verify that all participants exist
      const users = await User.find({ _id: { $in: participants } });
      if (users.length !== participants.length) {
        return res
          .status(400)
          .json({ error: "One or more participants do not exist" });
      }

      // Create the new group chat
      const newChatRoom = new ChatRoom({
        isGroupChat: true,
        groupName,
        groupAdmin,
        groupDescription,
        participants: [...participants, groupAdmin], // Include the admin in the participants list
      });
      await newChatRoom.save();

      res.status(200).json({ status: 200, data: newChatRoom });
    } catch (error) {
      console.error("Error creating group chat:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Get Group Chats
  async getGroupChats(req, res) {
    try {
      let token = req.header("Authorization");
      if (!token) {
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized: No token provided" });
      }

      token = await verifyToken(token.split(" ")[1]);
      const userId = token.user.id;
      console.log("dasd", userId);
      const groups = await ChatRoom.find({
        $or: [{ participants: userId }, { groupAdmin: userId }],
        isGroupChat: true,
      })
        .populate("participants", "username profileImage") // Populate participant details
        .populate("groupAdmin", "username profileImage"); // Populate admin details

      if (!groups.length) {
        return res
          .status(404)
          .json({ status: 404, message: "No groups found for this user" });
      }

      res.status(200).json({ status: 200, data: groups });
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ status: 500, message: "Server error" });
    }
  },

  // Update Group Chat
  async updateGroupChat(req, res) {
    try {
      let token = req.header("Authorization");
      const { chatRoomId } = req.params;
      const { groupName, participants } = req.body;

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      token = await verifyToken(token.split(" ")[1]);

      // Find the chat room
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        return res
          .status(404)
          .json({ status: 404, error: "Chat room not found" });
      }

      // Only the group admin can update the group
      if (chatRoom.groupAdmin.toString() !== token.user.id) {
        return res.status(403).json({
          status: 403,
          error: "Only the group admin can update the group",
        });
      }

      // Update the group name if provided
      if (groupName) {
        chatRoom.groupName = groupName;
      }

      // Update participants if provided
      if (participants && participants.length > 0) {
        const users = await User.find({ _id: { $in: participants } });
        if (users.length !== participants.length) {
          return res
            .status(400)
            .json({ error: "One or more participants do not exist" });
        }
        chatRoom.participants = [
          ...new Set([...chatRoom.participants, ...participants]),
        ];
      }

      await chatRoom.save();

      res.status(200).json({ status: 200, data: chatRoom });
    } catch (error) {
      console.error("Error updating group chat:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },

  // Delete Group Chat
  async deleteGroupChat(req, res) {
    try {
      let token = req.header("Authorization");
      const { chatRoomId } = req.params;

      if (!token) {
        return res
          .status(401)
          .json({ status: 401, error: "Unauthorized: No token provided" });
      }

      token = await verifyToken(token.split(" ")[1]);

      // Find the chat room
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        return res
          .status(404)
          .json({ status: 404, error: "Chat room not found" });
      }

      // Ensure the chat room is a group chat
      if (!chatRoom.isGroupChat) {
        return res
          .status(400)
          .json({ status: 400, error: "Cannot delete a direct chat" });
      }

      // Only the group admin can delete the group
      if (chatRoom.groupAdmin.toString() !== token.user.id) {
        return res.status(403).json({
          status: 403,
          error: "Only the group admin can delete the group",
        });
      }

      // Delete the chat room
      await chatRoom.deleteOne();

      res
        .status(200)
        .json({ status: 200, message: "Group chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting group chat:", error);
      res.status(500).json({ status: 500, message: error.message });
    }
  },
};
