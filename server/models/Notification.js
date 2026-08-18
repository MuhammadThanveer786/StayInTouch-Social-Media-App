import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    // User who should receive the notification
    recipient: {
      type: String,
      ref: "User",
      required: true,
    },

    // User who caused the notification
    sender: {
      type: String,
      ref: "User",
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "message",
      ],
      required: true,
    },

    // Related post, if applicable
    post: {
      type: String,
      ref: "Post",
      default: null,
    },

    // Related comment, if applicable
    comment: {
      type: String,
      ref: "Comment",
      default: null,
    },

    // Prevent duplicate/unwanted notifications
    message: {
      type: String,
      default: "",
    },

    // Whether user has opened/read it
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;