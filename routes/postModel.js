const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    postImage: String,
    caption: String,
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    date: {
        type: Date,
        default: Date.now()
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
