import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.js"
import { Subscription } from "../models/subscription.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    if(!mongoose.Types.ObjectId.isValid(channelId)) throw new ApiError(400,"channelId required")
    
    //check is the channel subscriber is a owner 
    if(channelId === userId.toString()) throw new ApiError(400,"You cannot subscribe to yourself")
    
    //check if already subscribed and delete
    const deletedSubscriber = await Subscription.findOneAndDelete({
        subscriber:userId,
        channel:channelId
    })

    if(deletedSubscriber){
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {isSubscribed:false},
                "Unsubscribed Successfully"
            )
        )
    }

    await Subscription.create({
        subscriber: userId,
        channel: channelId
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isSubscribed:true},
            "Subscribed Successfully"
        )
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.Types.ObjectId.isValid(channelId)) throw new ApiError(400, "Invalid channel id");

    const subscriptions = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar email")
        .sort({ createdAt: -1 });

    const subscribers = subscriptions.map(sub => sub.subscriber);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribers,
            "subscribers fetched successfully"
        )
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!mongoose.Types.ObjectId.isValid(subscriberId)) throw new ApiError(400,"Invalid subscriberId")
    
    const subscriptions = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "username avatar");

    // return only channel data
    const channels = subscriptions.map(sub => sub.channel);

    return res.status(200).json(
        new ApiResponse(
            200,
            channels,
            "Subscribed channels fetched successfully"
        )
    );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}