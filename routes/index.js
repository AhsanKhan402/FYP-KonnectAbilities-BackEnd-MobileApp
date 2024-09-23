var express = require("express");
const user = require("../controllers/user");
const post = require("../controllers/post");
const chatroom = require("../controllers/chatroom");
const adminUser = require("../controllers/adminUser");
const service = require("../controllers/service");
var router = express.Router();

// User Controller Routes
router.get("/users", (req, res) => user.getUsers(req, res));
router.post("/login", (req, res) => user.loginUser(req, res));
router.post("/signup", (req, res) => user.signUpUser(req, res));
router.get("/usersMe", (req, res) => user.getUserMe(req, res));
router.get("/user", (req, res) => user.getUserById(req, res));
router.put("/user", (req, res) => user.updateUser(req, res));
router.post("/user/followUnfollow", (req, res) => user.followUnfollowUser(req, res));
router.get("/user/searchByUsername", (req, res) => user.searchUsersByUsername(req, res));
router.post("/user/verification", (req, res) => user.verifyUser(req, res));

// Post Controller Routes
router.get("/posts", (req, res) => post.getPosts(req, res));
router.get("/posts/followed-user-posts", (req, res) => post.getFollowedUsersPosts(req, res));
router.get("/post", (req, res) => post.getPostById(req, res));
router.get("/posts/by-userId", (req, res) => post.getPostsByUserId(req, res));
router.post("/post", (req, res) => post.addPost(req, res));
router.put("/post", (req, res) => post.updatePost(req, res));
router.post("/post/like", (req, res) => post.likePost(req, res));
router.post("/post/comment", (req, res) => post.commentOnPost(req, res));
router.post("/post/share", (req, res) => post.sharePost(req, res)); 

// Chat Room Controller Routes
router.get("/chatrooms", (req, res) => chatroom.getChatroomByUserId(req, res));
router.get("/chatroom-messages", (req, res) => chatroom.getMessagesByChatroomId(req, res));
router.post("/create-chatroom", (req, res) => chatroom.createChatRoom(req, res));
router.post("/send-message", (req, res) => chatroom.addMessageToChatRoom(req, res));
router.post("/group/chatroom-create", (req, res) => chatroom.createGroupChat(req, res));
router.get("/group/chatrooms", (req, res) => chatroom.getGroupChats(req, res));
router.put("/group/chatroom-update", (req, res) => chatroom.updateGroupChat(req, res));
router.delete("/group/chatroom-delete", (req, res) => chatroom.deleteGroupChat(req, res));

// Service routes
router.post("/service", (req, res) => service.addService(req, res));
router.get("/services/user", (req, res) => service.getServices(req, res));

// Admin user routes
router.post("/admin/superAdmin", (req, res) => adminUser.createSuperAdminUser(req, res));
router.post("/admin/adminUser", (req, res) => adminUser.createAdminUser(req, res));
router.post("/admin/login", (req, res) => adminUser.loginAdminUser(req, res));
router.post("/admin/login/otp", (req, res) => adminUser.sendOtp(req, res));
router.put("/admin/update-password", (req, res) => adminUser.updateAdminPassword(req, res));
router.get("/admin/users", (req, res) => adminUser.getUsers(req, res));
router.get("/admin/user-id", (req, res) => adminUser.getUserById(req, res));
router.put("/admin/user-status", (req, res) => adminUser.updateUserVerificationStatus(req, res));
router.delete("/admin/user-delete", (req, res) => adminUser.deleteUser(req, res));
router.get("/admin/posts", (req, res) => adminUser.getAllPosts(req, res));
router.delete("/admin/post-delete", (req, res) => adminUser.deletePost(req, res));
router.get("/admin/services", (req, res) => adminUser.getAllServices(req, res));
router.put("/admin/service-status", (req, res) => adminUser.updateServiceStatus(req, res));
router.delete("/admin/service-delete", (req, res) => adminUser.deleteService(req, res));

router.get("/test", (req, res) => res.status(200).json("Backend is working!!"));

module.exports = router;
