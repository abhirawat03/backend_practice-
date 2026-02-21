import mongoose from "mongoose"
import {Video} from "../models/video.js"
import {Subscription} from "../models/subscription.js"
import {Like} from "../models/like.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelId = req.user?._id;
    if (!channelId) throw new ApiError(401, "Unauthorized");

    //total videos and views
    // const videoStats = await Video.aggregate([
    //     {
    //         $match:{
    //             owner:new mongoose.Types.ObjectId(channelId)
    //         }
    //     },
    //     {
    //         $group:{
    //             _id:null,
    //             totalVideos:{$sum: 1},
    //             totalViews:{$sum:"$views"}
    //         }
    //     }
    // ]);

    // const totalLikes = await Like.aggregate([
    //     {
    //         $lookup:{
    //             from:"videos",
    //             localField:"video",
    //             foreignField:"_id",
    //             as:"video"
    //         }
    //     },
    //     {
    //         $unwind:"$video"
    //     },
    //     {
    //         $match:{
    //             "video.owner":new mongoose.Types.ObjectId(channelId);
    //         }
    //     },
    //     {
    //         $count:"totalLikes"
    //     }
    // ]);

    // const totalSubscribers = await Subscription.countDocuments({
    //     channel:channelId
    // })

    // const stats = {
    //     totalVideos:videoStats[0]?.totalVideos || 0,
    //     totalViews:videoStats[0]?.totalViews || 0,
    //     totalLikes:totalLikes[0]?.totalLikes || 0,
    //     totalSubscribers
    // }

    const fullStats = await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },
        {
            $group:{
                _id:null,
                totalVideos:{$sum:1},
                totalViews:{$sum:"$views"},
                totalLikes:{$sum:{$size: "$likes"}}
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                pipeline:[
                    {
                        $match:{
                            channel:new mongoose.Types.ObjectId(channelId)
                        }
                    },
                    {$count:"totalSubscribers"}
                ],
                as:"subs"
            }
        },
        {
            $addFields:{
                totalSubscribers:{
                    $ifNull:[{$first:"$subs.totalSubscribers"},0]
                }
            }
        },
        {
            $project:{
                _id:0,
                totalVideos:1,
                totalViews:1,
                totalLikes:1,
                totalSubscribers:1
            }
        }
    ])

    const stats = {
        totalVideos:fullStats[0]?.totalVideos || 0,
        totalViews:fullStats[0]?.totalViews || 0,
        totalLikes:fullStats[0]?.totalLikes || 0,
        totalSubscribers:fullStats[0]?.totalSubscribers || 0,
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            stats,
            "Channel stats fetched successfully"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user?._id
    if(!channelId) throw new ApiError(401,"Unauthorized")
    
    const videos = await Video.find(
        {owner:channelId},
    ).sort({createdAt:-1})
    .select("title thumbnail views isPublished createdAt");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Your videos fetched successfully"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }