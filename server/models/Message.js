import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    from_user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    to_user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      default: "",
    },

    message_type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },

    media_url: {
      type: String,
      default: "",
    },

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

const Message = mongoose.model("Message", messageSchema);

export default Message;