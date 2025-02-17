import userModel from "../models/user.model.js";
import * as userService from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";
export const createUserController = async (req, res) => {
  const error = validationResult(req);
  console.log(req.body);

  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }

  try {
    const user = await userService.createUser(req.body);
    console.log(user);
    const token = await user.generateJWT();

    res.status(201).json({ user, token });
  } catch (e) {
    res.status(400).send(e.message);
  }
};

export const loginUserController = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }

  try {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await userModel.findOne({ email }).select("+password");
    console.log(user);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.isValidPassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await user.generateJWT();
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

export const getAllUserController = async (req, res) => {
  try {
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    const allUsers = await userService.getAllUser(loggedInUser._id);
    res.status(200).json({ users: allUsers });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

export const profleContoller = async (req, res) => {
  console.log(req.user);

  res.status(200).json({ user: req.user });
};

export const logoutController = async (req, res) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    redisClient.set(token, "logout", "EX", 24 * 60 * 60);
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(400).send(error.message);
  }
};
