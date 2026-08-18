import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      default: "",
    },

    media_type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },

    media_url: {
      type: String,
      default: "",
    },

    background_color: {
      type: String,
      default: "#4f46e5",
    },

    // Users who have viewed this story
    viewedBy: {
      type: [String],
      default: [],
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const Story = mongoose.model("Story", storySchema);

export default Story;