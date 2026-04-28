import e, { type Request, type Response } from "express";
import { householdSchema, joinSchema } from "../validation/household.schema";
import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../models/user";
import { generateInviteCode } from "../utils/inviteCode";
import { Household } from "../models/household";
import mongoose from "mongoose";
const householdRouter = e.Router();

householdRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { data, success } = householdSchema.safeParse(req.body);
      const userId = new mongoose.Types.ObjectId(req.userId);
      if (!success) {
        res.status(401).json({
          success,
          data: null,
          error: "Invalid input",
        });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
        });
        return;
      }
      if (user?.householdId) {
        res.status(400).json({
          success: false,
          data: null,
          error: "User already in a household",
        });
        return;
      }

      let inviteCode;
      let exists = true;
      while (exists) {
        inviteCode = generateInviteCode();
        const isValidCode = await Household.findOne({ inviteCode });
        if (!isValidCode) {
          exists = false;
        }
      }
      const houseHold = await Household.create({
        name: data.name,
        inviteCode,
        members: [userId],
        wasteScore: 0,
      });
      user.householdId = houseHold._id;
      await user.save();
      return res.status(201).json({
        success,
        data: {
          houseHold,
        },
        error: null,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);

householdRouter.post(
  "/join",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data, success } = joinSchema.safeParse(req.body);
    const userId = new mongoose.Types.ObjectId(req.userId);
    if (!success) {
      res.status(400).json({
        success,
        data: null,
        error: "Invalid input",
      });
      return;
    }
    try {
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
        });
        return;
      }
      if (user?.householdId) {
        res.status(400).json({
          success: false,
          data: null,
          error: "User already in a household",
        });
        return;
      }
      const houseHold = await Household.findOne({
        inviteCode: data.inviteCode,
      });
      if (!houseHold) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Household not found",
        });
        return;
      }
      const alreadyMember = houseHold.members.some(
        (member) => member.toString() === userId.toString(),
      );

      if (alreadyMember) {
        return res.status(400).json({
          success: false,
          data: null,
          error: "Already a member",
        });
      }
      houseHold.members.push(userId);
      await houseHold.save();

      user.householdId = houseHold._id;
      await user.save();
    } catch (e) {
      return res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);

householdRouter.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.userId);
    try {
      const houseHold = await Household.findOne({ members: userId }).populate(
        "members",
        "name email",
      );
      if (!houseHold) {
        res.status(404).json({
          success: false,
          data: null,
          error: "user is not in any household",
        });
        return;
      }
      res.json({
        success: true,
        data: {
          id: houseHold._id,
          name: houseHold.name,
          inviteCode: houseHold.inviteCode,
          members: houseHold.members,
          wasteScore: houseHold.wasteScore,
          currentUserId: userId.toString(),
        },
        error: null,
      });
      return;
    } catch (e) {
      return res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);

householdRouter.get(
  "/:id/members",
  authMiddleware,
  async (req: Request, res: Response) => {
    const householdId = req.params.id;
    const userId = req.userId;
    if (!householdId || typeof householdId !== "string") {
      res.status(400).json({
        success: false,
        data: null,
        error: "Invalid household id",
      });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(householdId)) {
      res.status(400).json({
        success: false,
        data: null,
        error: "Invalid household id",
      });
      return;
    }
    try {
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
        });
        return;
      }
      if (!user.householdId || user.householdId.toString() !== householdId) {
        res.status(403).json({
          success: false,
          data: null,
          error: "Unauthorized access",
        });
        return;
      }
      const houseHold = await Household.findById(householdId).populate(
        "members",
        "name email",
      );
      if (!houseHold) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Household not found",
        });
        return;
      }
      res.json({
        success: true,
        data: {
          members: houseHold.members,
        },
        error: null,
      });
      return;
    } catch (e) {
      return res.status(500).json({
        sucess: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);

householdRouter.delete(
  "/leave",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const user = await User.findById(userId);
      if (!user?.householdId) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Not in a household",
        });
        return;
      }
      await Household.findByIdAndUpdate(userId, {
        $pull: { members: user._id },
      });
      await User.findByIdAndUpdate(userId, { householdId: null });
    } catch (e) {
      return res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);
export default householdRouter;
