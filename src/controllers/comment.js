import mongoose from "mongoose"
import { Comment } from "../models/comment.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    page = Math.max(parseInt(page) || 1, 1);
    // limit = Math.min(parseInt(limit) || 10, 10);
    limit = Math.max(Math.min(parseInt(limit) || 10, 10), 1);
    const skip = (page - 1) * limit;

    if (!new mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId provided")
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        // {
        //     $sort:{
        //         createdAt:-1
        //     }
        // },
        // {
        //     $skip:skip
        // },
        // {
        //     $limit:limit
        // },
        // {
        //     $lookup:{
        //         from:"users",
        //         localField:"owner",
        //         foreignField:"_id",
        //         as:"owner",
        //         pipeline:[
        //             {
        //                 $project:{
        //                     username:1,
        //                     avatar:1
        //                 }
        //             }
        //         ]
        //     }
        // },
        // {
        //     $addFields:{
        //         owner:{
        //             $first:"owner"
        //         }
        //     }
        // },
        // { 
        //     $project: { 
        //         content: 1, 
        //         owner: 1, 
        //         createdAt: 1 
        //     } 
        // }
        {
            $facet: {
                // 🔹 comments with pagination
                result: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            owner: 1,
                            createdAt: 1
                        }
                    }
                ],

                // 🔹 total count
                totalCount: [
                    { $count: "count" }
                ]
            }
        }
    ])
    const allComment = comments[0].result;
    // const totalComments = await Comment.countDocuments({ video: new mongoose.Types.ObjectId(videoId) });
    const totalComments = comments[0].totalCount[0]?.count || 0;

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                allComment,
                totalComments,
                currentPage: page,
                totalPages: Math.max(Math.ceil(totalComments / limit), 1)
            },
            "Comments fetched successfully"
        ))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if (!new mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId provided")
    }

    if (!content.trim()) {
        throw new ApiError(400, "Comment content required")
    }

    const comment = await Comment.create({
        content: content.trim(),
        videoId: videoId,
        owner: req.user._id
    })

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            comment,
            "Comment added"
        ))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    if (!mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400,"Invalid commentId");

    if(!content ||!content.trim()) throw new ApiError(400,"content required")
    
    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id:commentId,
            owner:req.user?._id
        },
        {
            $set:{
                content:content.trim()
            }
        },
        {new:true}
    )

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found or not authorized");
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedComment,
        "comment updated successfully"
    ))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params
    if (!mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400,"Invalid commentId");

    const deletedComment = await Comment.findOneAndDelete({
        _id:commentId,
        owner:req.user?._id
    })

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or not authorized");
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Comment deleted successfully"
    ))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}