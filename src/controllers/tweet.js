import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.js"
import {User} from "../models/user.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    if(!content || !content.trim()) throw ApiError(400,"Content is required")
        
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    
    const createTweet = await Tweet.create({
        content:content.trim(),
        owner:userId
    })

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            createTweet,
            "Tweet Created Successfully"
        )
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;
    if(!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400,"Invalid UserId")

    const {page = 1,limit = 10} = req.query
    page = Math.max(parseInt(page) || 1, 1);
    // limit = Math.min(parseInt(limit) || 10, 10);
    limit = Math.max(Math.min(parseInt(limit) || 10, 10), 1);
    const skip = (page -1)*limit

    const result = await Tweet.aggregate([
        {
            $match:{
                owner:mongoose.Types.ObjectId(userId)
            }
        },
        {
            $facet:{
                tweets:[
                    {$sort:{createdAt:-1}},
                    {$skip:skip},
                    {$limit:limit},
                ],
                totalCount:[
                    {$count:'count'}
                ]
            }
        }
    ]);

    const tweets=result[0].tweets;
    const totalTweets = result[0].totalCount[0]?.count || 0;

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {   
                page:page,
                limit:limit,
                totalTweets,
                totalPages:Math.max(Math.ceil(totalTweets / limit), 1),
                tweets,
            },
            `Tweet user:${userId} is Successfully Fetched`
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized") 

    if(!mongoose.Types.ObjectId.isValid(tweetId)) throw new ApiError(400,"Invalid TweetId")

    if(!content || !content.trim()) throw new ApiError(400,"Content is required")
    
    const updateTweet = await Tweet.findOneAndUpdate(
        {_id:tweetId, owner:userId},
        {
            content:content.trim(),
        },
        {new:true}
    )
    if(!updateTweet) throw new ApiError(400,"Tweet not found or not yours")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updateTweet,
            "Tweet updated"
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if(!mongoose.Types.ObjectId.isValid(tweetId)) throw new ApiError(400,"Invalid TweetId")
    
    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized")

    const deletedTweet = await Tweet.findOneAndDelete(
        {
            _id:tweetId,
            owner:userId
        }
    )
    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found or not authorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
    ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}