import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/AppResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const AccessToken = await user.generateAccessToken();
        const RefreshToken = await user.generateRefreshToken();

        user.RefreshToken = RefreshToken;

        await user.save();

        return { AccessToken, RefreshToken };
    } catch (error) {
        throw new ApiError(500, "Could not generate tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;
    if (!fullName || !username || !email || !password) {
        throw new ApiError(400, "all fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath || !coverImageLocalPath) {
        throw new ApiError(400, "Avatar and cover image are required");
    }
    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Could not upload avatar image");
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, "User registered successfully", createdUser)
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
        throw new ApiError(400, "Username or email and password are required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordMatch(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }
    const tokens = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .cookie("accessToken", tokens.AccessToken, options)
        .cookie("refreshToken", tokens.RefreshToken, options)
        .json(
            new ApiResponse(200, "User logged in successfully", {
                user: loggedInUser,
                tokens,
            })
        );
});


const logout = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    user.RefreshToken = null;
    await user.save();

    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)

        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully", null));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!refreshToken) {
            throw new ApiError(401, "Refresh token is required");
        }
        const decodedToken = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findById(decodedToken.userId);
        if (!user || user.RefreshToken !== refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }
        const newAccessToken = await user.generateAccessToken();
    
        const options = {   
            httpOnly: true,
            secure: true,
        };  
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .json(
                new ApiResponse(200, "Access token refreshed successfully", {
                    accessToken: newAccessToken,
                })
            );
    } catch (error) {
        throw new ApiError(500, "Failed to refresh access token");
    }
});

export { registerUser, loginUser, logout, refreshAccessToken };
