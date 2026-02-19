import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.js"
import {User} from "../models/user.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if(!userId) throw new ApiError(400,"userId field is required")
    page = Math.max(parseInt(page) || 1, 1);
    // limit = Math.min(parseInt(limit) || 10, 10);
    limit = Math.max(Math.min(parseInt(limit) || 10, 10), 1);
    const skip = (page -1)*limit

    const allowedSortFields = ["createdAt", "views", "title"];
    const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

    const sortOrder = sortType === "asc" ? 1 : -1;
    let matchStage = {
        owner: new mongoose.Types.ObjectId(userId),
    };

    // search support
    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }
    const allvideos = await Video.aggregate([
        { $match: matchStage },
        {
            $facet:{
                videos:[
                    { $sort: { [sortField]: sortOrder } },
                    { $skip: skip},
                    { $limit: limitNum },
                    {
                        $project: {
                            title: 1,
                            views: 1,
                            isPublished: 1,
                            createdAt: 1,
                            owner: 1,
                        },
                    },
                ],
                totalCount:[
                    {
                        $count:'count'
                    }
                ]
            }
        }
    ]);
    const videos = allvideos[0].videos
    const totalVideos = allvideos[0].totalCount[0]?.count || 0;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                page: page,
                limit: limit,
                totalPages:Math.max(Math.ceil(totalVideos / limit), 1),
                totalVideos,
                videos,
            },
            "Videos fetched successfully"
        )
    );
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!videoFile || !thumbnail) {
        throw new ApiError(500, "Error while uploading video or thumbnail");
    }
     // Create video document
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        owner: req.user._id,
        duration: videoFile.duration,
        isPublished: true
    });

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            video,
            "Video published successfully"
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId")
    
    const video = await Video.findOneAndUpdate(
        { _id: videoId, isPublished: true },
        { $inc: { views: 1 } },
        { new: true }
    ).populate("owner", "username avatar");

    if(!video) throw new ApiError(404,"Video not found")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body;
    //TODO: update video details like title, description, thumbnail
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId")
    if(!title || !title.trim()) throw new ApiError(400,"title required")
    if(!description || !description.trim()) throw new ApiError(400,"description required")

    const existingVideo = await Video.findOne({
        _id:videoId,
        owner:req.user?._id
    })
    if (!existingVideo) {
        throw new ApiError(404, "Video not found");
    }

    const thumbnailLocalPath = req.file?.path

    if(!thumbnailLocalPath) throw new ApiError(400,"Thumbnail file is missing")
    
    const oldThumbnail = existingVideo.thumbnail;
    let newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!newThumbnail?.url) {
        throw new ApiError(500, "Thumbnail upload failed");
    }

    let video;
    try {
        // 2️⃣ update DB (source of truth)
        video = await Video.findOneAndUpdate(
            {
                _id:videoId,
                owner:req.user?._id
            },
            {
                $set:{
                    title:title.trim(),
                    description:description.trim(),
                    thumbnail:newThumbnail.url,
                }
            },
            {new:true}
        )

        if (!video) throw new Error("DB update failed");
    } catch (error) {
        // ==============================
        // 3️⃣ ROLLBACK (if DB fails)
        // ==============================
        if (newThumbnail?.url) {
            const publicId = newThumbnail.url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId).catch(()=>{});
        }

        throw new ApiError(500, "Video update failed");
    }

    // ==============================
    // 4️⃣ delete old thumbnail (cleanup)
    // only after DB success
    // ==============================
    if (oldThumbnail) {
        const publicId = oldThumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(()=>{});
    }
    
    return res
        .status(200)
        .json(
            new ApiResponse(200,video,"Video updated successfully")
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId");

    const deletedVideo = await Video.findOneAndDelete({
        _id:videoId,
        owner:req.user?._id
    })

    if (!deletedVideo) {
        throw new ApiError(404, "Video not found or not authorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Video deleted successfully"
    ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId");

    const video = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user?._id
        },
        [
            {
                $set: {
                    isPublished: { $not: "$isPublished" }
                }
            }
        ],
        { new: true }
    );

    if (!video) {
        throw new ApiError(404, "Video not found or unauthorized");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            `Video is now ${video.isPublished ? "public" : "private"}`
        )
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}