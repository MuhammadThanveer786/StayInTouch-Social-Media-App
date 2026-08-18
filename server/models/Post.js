import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    user: {
      type: String,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      default: "",
    },

    image_urls: {
      type: [String],
      default: [],
    },

    likes_count: {
      type: [String],
      default: [],
    },

    comments_count: {
  type: Number,
  default: 0,
},



  },
  {
    timestamps: true,
    minimize: false,
  }
);

const Post = mongoose.model("Post", postSchema);

export default Post;