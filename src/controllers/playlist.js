import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    const userId = req.user?._id
    if(!userId) throw new ApiError(401,"Unauthorized")

    //validation
    if(!name || !name.trim()) throw new ApiError(400,"Name is required")
    
    const playlist = await Playlist.create({
        name:name.trim(),
        description:description?.trim() || "",
        owner:userId
    })
    if (!playlist) throw new ApiError(400, "Error creating the playlist");

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            playlist,
            "Playlist created successfully"
        )
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400,"Invalid userId")
    
    const playlist = await Playlist.find({owner:userId})
    .sort({createdAt : -1})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "User playlists fetched successfully"
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400,"Invalid playlistId")

    const playlist = await Playlist.findById(
        playlistId
    )
    if(!playlist) throw new ApiError(404, "Playlist not found")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        )
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized")

    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400,"Invalid playlistId")
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId")

    // add video (only if playlist belongs to user)
    const addedVideoToPlaylist = await Playlist.findOneAndUpdate(
        {_id:playlistId , owner:userId},
        {
            $addToSet:{
                video:videoId
            }
        },
        {new:true}
    )

    if(!addedVideoToPlaylist) throw new ApiError(404, "Playlist not found or not authorized")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            addedVideoToPlaylist,
            "Video added to playlist successfully"
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized")

    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400,"Invalid playlistId")
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400,"Invalid videoId")

    const removedVideoFromPlaylist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: userId },
        { $pull: { videos: videoId } },   // remove video from array
        { new: true }
    );

    if(!removedVideoFromPlaylist) throw new ApiError(404,"Playlist not found or not authorized")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            removedVideoFromPlaylist,
            "Video removed from playlist successfully"
        )
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized")
    
    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400,"Invalid playlistId")
    
    const deletedPlaylist = await Playlist.findOneAndDelete(
        {
            _id:playlistId,
            owner:userId
        }
    )
    if(!deletedPlaylist) throw new ApiError(404,"Playlist not found or not authorized")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    const userId = req.user?._id;
    if(!userId) throw new ApiError(401,"Unauthorized")
    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400,"Invalid playlistId")
    if(!name || !name.trim()) throw new ApiError (400,"name is required")
    
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id:playlistId,
            owner:userId
        },
        {
            name:name.trim(),
            description:description?.trim() || "",
        },
        {new:true}
    )

    if(!updatedPlaylist) throw new ApiError(404,"Playlist not found or not authorized")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        )
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}