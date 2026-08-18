import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    post: {
      type: String,
      ref: "Post",
      required: true,
    },

    user: {
      type: String,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;