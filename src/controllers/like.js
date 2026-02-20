import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const userId = req.user?._id
    if(!userId) throw new ApiError(401,"Unauthorized")
    
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId")
    
    //try removing like first
    const deleted = await Like.findOneAndDelete(
        {
            video:videoId,
            likedBy:userId
        }
    )
    if(deleted) {
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked:false},
                "Video unliked successfully"
            )
        )
    }

    //otherwise add like
    await Like.create({
        video:videoId,
        likedBy:userId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked:true},
            "Video liked successfully"
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const userId = req.user?._id
    if(!userId) throw new ApiError(401,"Unauthorized")
    
    if(!mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400,"Invalid commentId")
    
    //try removing like first
    const deleted = await Like.findOneAndDelete(
        {
            comment:commentId,
            likedBy:userId
        }
    )
    if(deleted) {
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked:false},
                "comment unliked successfully"
            )
        )
    }

    //otherwise add like
    await Like.create({
        comment:commentId,
        likedBy:userId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked:true},
            "comment liked successfully"
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const userId = req.user?._id
    if(!userId) throw new ApiError(401,"Unauthorized")
    
    if(!mongoose.Types.ObjectId.isValid(tweetId)) throw new ApiError(400,"Invalid tweetId")
    
    //try removing like first
    const deleted = await Like.findOneAndDelete(
        {
            tweet:tweetId,
            likedBy:userId
        }
    )
    if(deleted) {
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked:false},
                "Tweet unliked successfully"
            )
        )
    }

    //otherwise add like
    await Like.create({
        tweet:tweetId,
        likedBy:userId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked:true},
            "Tweet liked successfully"
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id
    if(!userId) throw new ApiError(401,"Unauthorized")
    
    const likedVideos = await Like.find(
        {likedBy:userId}
    ).populate({
        path:"video",
        select:"title thumbnail duration views owner",
        populate:{
            path:"owner",
            select:"username avatar"
        }
    }).sort({ createdAt: -1 });

    //extract only video object
    const videos = likedVideos.map(like => like.video);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Liked videos fetched successfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}