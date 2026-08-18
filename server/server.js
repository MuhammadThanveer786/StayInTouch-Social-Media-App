import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import { clerkMiddleware, getAuth, clerkClient } from '@clerk/express';

import connectDB from './configs/db.js';
import User from './models/User.js';
import imagekit from './configs/imagekit.js';
import Comment from './models/Comment.js';
import Post from './models/Post.js';
import Notification from "./models/Notification.js";
import Message from './models/Message.js';
import Story from './models/Story.js';
import ConnectionRequest from './models/ConnectionRequest.js';

import { inngest, functions } from './inngest/index.js';
import { serve } from 'inngest/express';



const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://stay-in-touch-social-media-app.vercel.app'
];

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});


// =========================================================
// SOCKET.IO
// =========================================================

io.on('connection', (socket) => {

    console.log(
        'Socket.IO client connected:',
        socket.id
    );


    socket.on('disconnect', () => {

        console.log(
            'Socket.IO client disconnected:',
            socket.id
        );

    });

});



await connectDB();





app.use(clerkMiddleware());

app.use(express.json());
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));




// ImageKit upload authentication
app.get('/api/imagekit/auth', async (req, res) => {
    try {
        const { isAuthenticated } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const authenticationParameters =
            imagekit.helper.getAuthenticationParameters();

        res.json({
            success: true,
            ...authenticationParameters,
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
        });

    } catch (error) {
        console.error(
            'Error generating ImageKit authentication:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to generate ImageKit authentication'
        });
    }
});








app.get('/', (req, res) => res.send('Server is running'));

app.get('/api/auth/me', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Get complete user information from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);

        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'User email not found'
            });
        }

        // Generate username from email
        let username = email.split('@')[0];

        // Check if user already exists
        let user = await User.findById(userId);

        if (!user) {
            // Make username unique
            const existingUser = await User.findOne({ username });

            if (existingUser) {
                username = `${username}${Math.floor(Math.random() * 10000)}`;
            }

            user = await User.create({
                _id: userId,
                email: email,
                full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                username: username,
                profile_picture: clerkUser.imageUrl || ''
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Error syncing user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to sync user'
        });
    }
});


// Get / sync logged-in user's profile
app.get('/api/users/me', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Get complete user information from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);

        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'User email not found'
            });
        }

        // Check whether user already exists in MongoDB
        let user = await User.findById(userId);

        // If this is a new Clerk user, create MongoDB user
        if (!user) {

            let username = email.split('@')[0];

            // Make username unique
            const existingUser = await User.findOne({
                username
            });

            if (existingUser) {
                username = `${username}${Math.floor(Math.random() * 10000)}`;
            }

            user = await User.create({
                _id: userId,
                email: email,
                full_name:
                    `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                username: username,
                profile_picture: clerkUser.imageUrl || ''
            });

            console.log(
                `New user synced to MongoDB: ${userId}`
            );
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {

        console.error(
            'Error fetching/syncing user:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
});






// =========================================================
// GET USER BY ID
// =========================================================

app.get('/api/users/:userId', async (req, res) => {
    try {

        const { isAuthenticated } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { userId } = req.params;


        // =====================================================
        // FETCH USER
        // =====================================================

        const user = await User.findById(userId).select(
            'full_name username profile_picture cover_photo bio location followers following connections createdAt'
        );


        // =====================================================
        // USER NOT FOUND
        // =====================================================

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        // =====================================================
        // RESPONSE
        // =====================================================

        res.json({
            success: true,
            user
        });


    } catch (error) {

        console.error(
            'Error fetching user by ID:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });

    }
});


// Follow a user
app.post('/api/users/:userId/follow', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { userId: targetUserId } = req.params;

        // Cannot follow yourself
        if (userId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot follow yourself'
            });
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Already following
        if (currentUser.following.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                message: 'Already following this user'
            });
        }

        // Add target user to current user's following
        currentUser.following.push(targetUserId);

        // Add current user to target user's followers
        targetUser.followers.push(userId);

        await currentUser.save();
        await targetUser.save();

        res.json({
            success: true,
            message: 'User followed successfully',
            following: true,
            followersCount: targetUser.followers.length
        });

    } catch (error) {
        console.error('Error following user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to follow user'
        });
    }
});


// Unfollow a user
app.delete('/api/users/:userId/follow', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { userId: targetUserId } = req.params;

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove target from following
        currentUser.following = currentUser.following.filter(
            id => id !== targetUserId
        );

        // Remove current user from target's followers
        targetUser.followers = targetUser.followers.filter(
            id => id !== userId
        );

        await currentUser.save();
        await targetUser.save();

        res.json({
            success: true,
            message: 'User unfollowed successfully',
            following: false,
            followersCount: targetUser.followers.length
        });

    } catch (error) {
        console.error('Error unfollowing user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to unfollow user'
        });
    }
});







// Send a connection request
app.post('/api/connections/request/:userId', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { userId: recipientId } = req.params;

        if (userId === recipientId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot send a connection request to yourself'
            });
        }

        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const sender = await User.findById(userId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Current user not found'
            });
        }

        if (sender.connections.includes(recipientId)) {
            return res.status(400).json({
                success: false,
                message: 'You are already connected with this user'
            });
        }

        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                {
                    sender: userId,
                    recipient: recipientId,
                    status: 'pending'
                },
                {
                    sender: recipientId,
                    recipient: userId,
                    status: 'pending'
                }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'A connection request already exists'
            });
        }

        const request = await ConnectionRequest.create({
            _id: crypto.randomUUID(),
            sender: userId,
            recipient: recipientId,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Connection request sent',
            request: {
                _id: request._id,
                sender: request.sender,
                recipient: request.recipient,
                status: request.status
            }
        });

    } catch (error) {
        console.error('Error sending connection request:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to send connection request'
        });
    }
});






// Accept a connection request
app.patch('/api/connections/:userId/accept', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // :userId is the person who sent the request
        const senderId = req.params.userId;

        if (senderId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid connection request'
            });
        }

        // Find pending request sent by sender to current user
        const request = await ConnectionRequest.findOne({
            sender: senderId,
            recipient: userId,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Pending connection request not found'
            });
        }

        const currentUser = await User.findById(userId);
        const sender = await User.findById(senderId);

        if (!currentUser || !sender) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add each user to the other's connections
        if (!currentUser.connections.includes(senderId)) {
            currentUser.connections.push(senderId);
        }

        if (!sender.connections.includes(userId)) {
            sender.connections.push(userId);
        }

        await currentUser.save();
        await sender.save();

        // Mark request as accepted
        request.status = 'accepted';
        await request.save();

        res.json({
            success: true,
            message: 'Connection request accepted',
            connection: {
                userId: senderId
            }
        });

    } catch (error) {
        console.error('Error accepting connection request:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to accept connection request'
        });
    }
});








// Get current user's connections
app.get('/api/connections', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const user = await User.findById(userId)
            .populate(
                'followers',
                '_id full_name username bio profile_picture location followers following connections'
            )
            .populate(
                'following',
                '_id full_name username bio profile_picture location followers following connections'
            )
            .populate(
                'connections',
                '_id full_name username bio profile_picture location followers following connections'
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get pending connection requests received by current user
        const pendingRequests = await ConnectionRequest.find({
            recipient: userId,
            status: 'pending'
        })
            .populate(
                'sender',
                '_id full_name username bio profile_picture location followers following connections'
            )
            .sort({ createdAt: -1 });

        // Return the sender's user object for the Pending tab
        const pending = pendingRequests.map(request => request.sender);

        res.json({
            success: true,

            followers: user.followers || [],
            following: user.following || [],
            pending,
            connections: user.connections || [],

            counts: {
                followers: user.followers?.length || 0,
                following: user.following?.length || 0,
                pending: pending.length,
                connections: user.connections?.length || 0
            }
        });

    } catch (error) {
        console.error('Error fetching connections:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch connections'
        });
    }
});












// Search / discover users
app.get('/api/users', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { search = '' } = req.query;

        const searchText = search.trim();

        const query = {
            _id: { $ne: userId }
        };

        // Search only when text is provided
        if (searchText) {
            query.$or = [
                { full_name: { $regex: searchText, $options: 'i' } },
                { username: { $regex: searchText, $options: 'i' } },
                { bio: { $regex: searchText, $options: 'i' } },
                { location: { $regex: searchText, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select(
                '_id full_name username bio profile_picture location followers following connections'
            )
            .limit(20);

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error('Error searching users:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
});








// =========================================================
// UPDATE LOGGED-IN USER'S PROFILE
// =========================================================

app.put('/api/users/profile', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const {
            full_name,
            username,
            bio,
            location,
            profile_picture,
            cover_photo
        } = req.body;


        // =====================================================
        // CHECK USERNAME AVAILABILITY
        // =====================================================

        if (username) {

            const existingUser = await User.findOne({
                username,
                _id: { $ne: userId }
            });

            if (existingUser) {

                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken'
                });

            }

        }


        // =====================================================
        // BUILD UPDATE OBJECT
        // =====================================================

        const updateData = {

            ...(full_name !== undefined && {
                full_name
            }),

            ...(username !== undefined && {
                username
            }),

            ...(bio !== undefined && {
                bio
            }),

            ...(location !== undefined && {
                location
            }),

            ...(profile_picture !== undefined && {
                profile_picture
            }),

            ...(cover_photo !== undefined && {
                cover_photo
            })

        };


        // =====================================================
        // UPDATE USER
        // =====================================================

        const updatedUser =
            await User.findByIdAndUpdate(
                userId,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!updatedUser) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }


        // =====================================================
        // RESPONSE
        // =====================================================

        res.json({
            success: true,
            user: updatedUser
        });


    } catch (error) {

        console.error(
            'Error updating profile:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });

    }
});







// Create a new post
app.post('/api/posts', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { content, image_urls } = req.body;

        // A post must contain either text or at least one image
        if (
            (!content || !content.trim()) &&
            (!Array.isArray(image_urls) || image_urls.length === 0)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Post content or image is required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Only accept an array of image URLs
        const validImageUrls = Array.isArray(image_urls)
            ? image_urls.filter(
                (url) =>
                    typeof url === 'string' &&
                    url.trim().length > 0
            )
            : [];

        const post = await Post.create({
            _id: crypto.randomUUID(),
            user: userId,
            content: content ? content.trim() : '',
            image_urls: validImageUrls,
            likes_count: [],
            comments_count: 0
        });

        const populatedPost = await Post.findById(post._id)
            .populate(
                'user',
                'full_name username profile_picture'
            );

        res.status(201).json({
            success: true,
            post: populatedPost
        });

    } catch (error) {
        console.error('Error creating post:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create post'
        });
    }
});





// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('user', 'full_name username profile_picture')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            posts
        });

    } catch (error) {
        console.error('Error fetching posts:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts'
        });
    }
});






// Get posts of a particular user
app.get('/api/posts/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const posts = await Post.find({
            user: userId
        })
            .populate('user', 'full_name username profile_picture')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            posts
        });

    } catch (error) {
        console.error('Error fetching user posts:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch user posts'
        });
    }
});







// Edit a post
app.put('/api/posts/:postId', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { postId } = req.params;
        const { content, image_urls } = req.body;

        // Find the post
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Only the owner can edit the post
        if (post.user !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own posts'
            });
        }

        // Validate content/image
        const cleanContent =
            typeof content === 'string'
                ? content.trim()
                : '';

        const validImageUrls = Array.isArray(image_urls)
            ? image_urls.filter(
                (url) =>
                    typeof url === 'string' &&
                    url.trim().length > 0
            )
            : [];

        if (!cleanContent && validImageUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Post content or image is required'
            });
        }

        // Update only editable fields
        post.content = cleanContent;
        post.image_urls = validImageUrls;

        await post.save();

        // Return the updated post with user information
        const updatedPost = await Post.findById(postId)
            .populate(
                'user',
                'full_name username profile_picture'
            );

        res.json({
            success: true,
            post: updatedPost
        });

    } catch (error) {
        console.error('Error editing post:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to edit post'
        });
    }
});











// Delete a post
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { postId } = req.params;

        // Find the post
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Only the owner can delete the post
        if (post.user !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        // Delete all comments belonging to this post
        await Comment.deleteMany({
            post: postId
        });

        // Delete the post
        await Post.findByIdAndDelete(postId);

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting post:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete post'
        });
    }
});








// Like / Unlike a post
app.post('/api/posts/:postId/like', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { postId } = req.params;

        // Find the post
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const alreadyLiked = post.likes_count.includes(userId);

        if (alreadyLiked) {

            // ==========================================
            // UNLIKE
            // ==========================================

            post.likes_count = post.likes_count.filter(
                id => id !== userId
            );

            await post.save();

            // Remove the like notification
            await Notification.deleteOne({
                recipient: post.user,
                sender: userId,
                post: postId,
                type: 'like'
            });

        } else {

            // ==========================================
            // LIKE
            // ==========================================

            post.likes_count.push(userId);

            await post.save();

            // Don't notify yourself
            if (post.user !== userId) {

                await Notification.create({
                    _id: crypto.randomUUID(),
                    recipient: post.user,
                    sender: userId,
                    type: 'like',
                    post: postId,
                    message: 'liked your post'
                });

            }
        }

        res.json({
            success: true,
            liked: !alreadyLiked,
            likesCount: post.likes_count.length
        });

    } catch (error) {

        console.error(
            'Error liking/unliking post:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update like'
        });
    }
});

// Create a comment
app.post('/api/comments', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { postId, content } = req.body;

        if (!postId || !content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post ID and comment content are required'
            });
        }

        // Check whether the post exists
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Create comment
        const comment = await Comment.create({
            _id: crypto.randomUUID(),
            post: postId,
            user: userId,
            content: content.trim()
        });

        // Increment comment count
        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $inc: { comments_count: 1 } },
            { new: true }
        );

        // Create notification for post owner
        // Don't notify yourself
        if (post.user !== userId) {

            await Notification.create({
                _id: crypto.randomUUID(),
                recipient: post.user,
                sender: userId,
                type: 'comment',
                post: postId,
                comment: comment._id,
                message: 'commented on your post'
            });

        }

        // Populate comment user information
        const populatedComment = await Comment.findById(comment._id)
            .populate(
                'user',
                'full_name username profile_picture'
            );

        res.status(201).json({
            success: true,
            comment: populatedComment,
            commentsCount: updatedPost.comments_count
        });

    } catch (error) {

        console.error('Error creating comment:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create comment'
        });
    }
});


// Get comments for a post
app.get('/api/comments/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        const comments = await Comment.find({
            post: postId
        })
            .populate('user', 'full_name username profile_picture')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            comments
        });

    } catch (error) {
        console.error('Error fetching comments:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
});






// ImageKit authentication endpoint
app.get('/api/imagekit/auth', async (req, res) => {
    try {
        const { isAuthenticated } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const authenticationParameters =
            imagekit.helper.getAuthenticationParameters();

        res.json({
            success: true,
            ...authenticationParameters
        });

    } catch (error) {
        console.error('Error generating ImageKit authentication:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to generate ImageKit authentication'
        });
    }
});


// Get notifications for logged-in user
app.get('/api/notifications', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const notifications = await Notification.find({
            recipient: userId
        })
            .populate(
                'sender',
                'full_name username profile_picture'
            )
            .populate(
                'post',
                'content image_urls'
            )
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            notifications
        });

    } catch (error) {

        console.error(
            'Error fetching notifications:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});



// Get unread notification count
app.get('/api/notifications/unread-count', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.json({
            success: true,
            unreadCount
        });

    } catch (error) {

        console.error(
            'Error fetching unread notification count:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread notification count'
        });
    }
});



// Mark a single notification as read
app.patch('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { notificationId } = req.params;

        // Find notification and make sure it belongs to the logged-in user
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Only update if it is currently unread
        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }

        // Get updated unread count
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification,
            unreadCount
        });

    } catch (error) {
        console.error(
            'Error marking notification as read:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});





// Mark all notifications as read
app.patch('/api/notifications/read-all', async (req, res) => {
    try {
        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        await Notification.updateMany(
            {
                recipient: userId,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        // Confirm unread count is now accurate
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.json({
            success: true,
            message: 'All notifications marked as read',
            unreadCount
        });

    } catch (error) {
        console.error(
            'Error marking all notifications as read:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});





// GET UNREAD MESSAGE COUNT
app.get('/api/messages/unread-count', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Count unread messages received by the current user
        const unreadCount = await Message.countDocuments({
            to_user_id: userId,
            isRead: false
        });

        res.json({
            success: true,
            unreadCount
        });

    } catch (error) {

        console.error(
            'Error fetching unread message count:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread message count'
        });

    }
});





// =========================================================
// GET RECENT MESSAGES
// =========================================================

app.get('/api/messages/recent', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }


        // Find current user
        const currentUser = await User.findById(userId);

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        // Get connected users
        const connectionIds = currentUser.connections || [];


        // If there are no connections
        if (connectionIds.length === 0) {
            return res.json({
                success: true,
                recentMessages: []
            });
        }


        // Build recent conversation data
        const recentMessages = await Promise.all(

            connectionIds.map(async (connectionId) => {

                // Find connection user
                const connectionUser =
                    await User.findById(connectionId)
                        .select(
                            '_id full_name username bio profile_picture'
                        );

                // Skip if user no longer exists
                if (!connectionUser) {
                    return null;
                }


                // Find latest message exchanged between both users
                const latestMessage =
                    await Message.findOne({

                        $or: [

                            {
                                from_user_id: userId,
                                to_user_id: connectionId
                            },

                            {
                                from_user_id: connectionId,
                                to_user_id: userId
                            }

                        ]

                    })
                        .sort({
                            createdAt: -1
                        });


                // Count unread messages received from this user
                const unreadCount =
                    await Message.countDocuments({

                        from_user_id: connectionId,

                        to_user_id: userId,

                        isRead: false

                    });


                return {

                    user: connectionUser,

                    lastMessage: latestMessage
                        ? {
                            _id: latestMessage._id,
                            text: latestMessage.text,
                            message_type:
                                latestMessage.message_type,
                            media_url:
                                latestMessage.media_url,
                            isRead:
                                latestMessage.isRead,
                            createdAt:
                                latestMessage.createdAt
                        }
                        : null,

                    unreadCount

                };

            })

        );


        // Remove connections that no longer exist
        const filteredMessages =
            recentMessages.filter(Boolean);


        // Conversations with a message first,
        // then sort by latest message time
        filteredMessages.sort((a, b) => {

            if (!a.lastMessage && !b.lastMessage) {
                return 0;
            }

            if (!a.lastMessage) {
                return 1;
            }

            if (!b.lastMessage) {
                return -1;
            }

            return (
                new Date(b.lastMessage.createdAt) -
                new Date(a.lastMessage.createdAt)
            );

        });


        res.json({
            success: true,
            recentMessages: filteredMessages
        });


    } catch (error) {

        console.error(
            'Error fetching recent messages:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent messages'
        });

    }
});








// =========================================================
// SEND A MESSAGE
// =========================================================

app.post('/api/messages', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const {
            to_user_id,
            text,
            message_type = 'text',
            media_url = ''
        } = req.body;


        // Validate receiver
        if (!to_user_id) {
            return res.status(400).json({
                success: false,
                message: 'Receiver user ID is required'
            });
        }


        // Validate that the message contains something
        if (
            message_type === 'text' &&
            (!text || !text.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Message text is required'
            });
        }


        // Prevent sending message to yourself
        if (to_user_id === userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot send a message to yourself'
            });
        }


        // Check whether receiver exists
        const receiver = await User.findById(to_user_id);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver user not found'
            });
        }


        // Only connected users can send messages
        const sender = await User.findById(userId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: 'Sender user not found'
            });
        }

        if (!sender.connections.includes(to_user_id)) {
            return res.status(403).json({
                success: false,
                message: 'You can only message your connections'
            });
        }







        // Validate message type
        if (!['text', 'image'].includes(message_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message type'
            });
        }


        // Image message must have media URL
        if (
            message_type === 'image' &&
            !media_url
        ) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }


        // Create message
        const message = await Message.create({

            _id: crypto.randomUUID(),

            from_user_id: userId,

            to_user_id: to_user_id,

            text:
                message_type === 'text'
                    ? text.trim()
                    : '',

            message_type,

            media_url,

            isRead: false

        });


        // Populate sender and receiver information
        const populatedMessage =
            await Message.findById(message._id)
                .populate(
                    'from_user_id',
                    'full_name username profile_picture'
                )
                .populate(
                    'to_user_id',
                    'full_name username profile_picture'
                );


        res.status(201).json({
            success: true,
            message: populatedMessage
        });


    } catch (error) {

        console.error(
            'Error sending message:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });

    }
});







// MARK MESSAGES AS READ
app.patch('/api/messages/:userId/read', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { userId: otherUserId } = req.params;

        // Prevent marking your own conversation as read
        if (otherUserId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation'
            });
        }

        // Check whether the other user exists
        const otherUser = await User.findById(otherUserId);

        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Mark unread messages sent by the other user as read
        const result = await Message.updateMany(
            {
                from_user_id: otherUserId,
                to_user_id: userId,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        res.json({
            success: true,
            message: 'Messages marked as read',
            modifiedCount: result.modifiedCount
        });

    } catch (error) {

        console.error(
            'Error marking messages as read:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });

    }
});





// =========================================================
// GET UNREAD MESSAGE COUNT
// =========================================================

app.get('/api/messages/unread-count', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const unreadCount = await Message.countDocuments({
            to_user_id: userId,
            isRead: false
        });

        res.json({
            success: true,
            unreadCount
        });

    } catch (error) {

        console.error(
            'Error fetching unread message count:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread message count'
        });

    }
});










// =========================================================
// GET CONVERSATION
// =========================================================

app.get('/api/messages/:userId', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }


        const { userId: otherUserId } = req.params;


        // Prevent requesting conversation with yourself
        if (otherUserId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation'
            });
        }


        // Check whether other user exists
        const otherUser = await User.findById(
            otherUserId
        );

        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }



        // Only connections can view conversations
        const currentUser = await User.findById(userId);

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'Current user not found'
            });
        }

        if (!currentUser.connections.includes(otherUserId)) {
            return res.status(403).json({
                success: false,
                message: 'You can only view conversations with your connections'
            });
        }









        // Get messages exchanged between both users
        const messages = await Message.find({

            $or: [

                {
                    from_user_id: userId,
                    to_user_id: otherUserId
                },

                {
                    from_user_id: otherUserId,
                    to_user_id: userId
                }

            ]

        })
            .populate(
                'from_user_id',
                'full_name username profile_picture'
            )
            .populate(
                'to_user_id',
                'full_name username profile_picture'
            )
            .sort({
                createdAt: 1
            });


        res.json({
            success: true,
            messages
        });


    } catch (error) {

        console.error(
            'Error fetching messages:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });

    }
});





// =========================================================
// CREATE STORY
// =========================================================

app.post('/api/stories', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const {
            content = '',
            media_type = 'text',
            media_url = '',
            background_color = '#4f46e5'
        } = req.body;


        // Validate media type

        if (!['text', 'image', 'video'].includes(media_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story media type'
            });
        }


        // Text story must contain text

        if (
            media_type === 'text' &&
            !content.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Story text is required'
            });
        }


        // Image/video story must contain media URL

        if (
            media_type !== 'text' &&
            !media_url
        ) {
            return res.status(400).json({
                success: false,
                message: 'Story media URL is required'
            });
        }


        // Check user

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        // Story expires after 24 hours

        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );


        const story = await Story.create({

            user_id: userId,

            content:
                media_type === 'text'
                    ? content.trim()
                    : '',

            media_type,

            media_url,

            background_color,

            expiresAt

        });


        // Populate user information

        const populatedStory =
            await Story.findById(story._id)
                .populate(
                    'user_id',
                    'full_name username profile_picture'
                );


        // =========================================================
        // REAL-TIME STORY CREATED EVENT
        // =========================================================

        const storyForClients = {
            ...populatedStory.toObject(),

            user: populatedStory.user_id,

            // The creator has not viewed their own story
            // through the viewer flow.
            isViewed: false
        };


        io.emit(
            'story:created',
            storyForClients
        );




        res.status(201).json({
            success: true,
            story: storyForClients
        });

    } catch (error) {

        console.error(
            'Error creating story:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to create story'
        });

    }
});







// =========================================================
// GET ACTIVE STORIES
// =========================================================

app.get('/api/stories', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }


        const stories = await Story.find({
            expiresAt: {
                $gt: new Date()
            }
        })
            .populate(
                'user_id',
                'full_name username profile_picture'
            )
            .sort({
                createdAt: -1
            });


        const formattedStories = stories.map(
            (story) => {

                const storyObject =
                    story.toObject();

                return {
                    ...storyObject,

                    // User information
                    user: story.user_id,

                    // Whether the authenticated user
                    // has viewed this story
                    isViewed:
                        story.viewedBy?.includes(
                            userId
                        ) || false
                };

            }
        );


        res.json({
            success: true,
            stories: formattedStories
        });


    } catch (error) {

        console.error(
            'Error fetching stories:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch stories'
        });

    }
});








// =========================================================
// MARK STORY AS VIEWED
// =========================================================

app.patch('/api/stories/:storyId/view', async (req, res) => {
    try {

        const { isAuthenticated, userId } = getAuth(req);

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }


        const { storyId } = req.params;


        // Find the story
        const story = await Story.findById(storyId);

        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found'
            });
        }


        // Don't allow the story owner to be
        // added as a viewer
        if (story.user_id === userId) {
            return res.json({
                success: true,
                message: 'Story owner does not need to mark story as viewed'
            });
        }


        // Add current user only if they
        // haven't viewed this story already
        if (!story.viewedBy?.includes(userId)) {

            story.viewedBy.push(userId);

            await story.save();

            // =========================================================
            // REAL-TIME STORY VIEWED EVENT
            // =========================================================

            io.emit(
                'story:viewed',
                {
                    storyId: story._id.toString(),
                    userId
                }
            );

        }


        res.json({
            success: true,
            message: 'Story marked as viewed'
        });


    } catch (error) {

        console.error(
            'Error marking story as viewed:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to mark story as viewed'
        });

    }
});







app.use('/api/inngest', serve({ client: inngest, functions }));

const PORT = process.env.PORT || 4000;

httpServer.listen(
    PORT,
    () => console.log(
        `Server is running on port ${PORT}`
    )
);