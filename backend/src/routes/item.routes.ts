import e, { type Request, type Response } from "express";
import {
  createItemSchema,
  getItemSchema,
  patchItemSchema,
  updateItemSchema,
} from "../validation/item.schema";
import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../models/user";
import { Item } from "../models/item";
import { computeStatus } from "../utils/computeStatus";
import mongoose from "mongoose";
import { Household } from "../models/household";
const itemRouter = e.Router();

itemRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, success } = createItemSchema.safeParse(req.body);
  const userId = req.userId;
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
    if (!user.householdId) {
      res.status(400).json({
        success: false,
        data: null,
        error: "user is not in any household",
      });
      return;
    }
    const item = await Item.create({
      householdId: user.householdId,
      addedBy: userId,
      name: data.name,
      category: data.category,
      expiryDate: new Date(data.expiryDate),
      quantity: data.quantity || 1,
      status: computeStatus(new Date(data.expiryDate)),
    });
    const populated = await item.populate("addedBy", "name");
    res.status(201).json({
      success: true,
      data: {
        populated,
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
});

itemRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data, success } = getItemSchema.safeParse(req.query);
    const userId = req.userId;
    if (!success) {
      res.status(400).json({
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
    if (!user.householdId) {
      res.status(400).json({
        success: false,
        data: null,
        error: "user is not in any household",
      });
      return;
    }
    const filter: Record<string, unknown> = {
      householdId: user.householdId,
    };

    if (data.status) {
      filter.status = data.status;
    }

    if (data.category) {
      filter.category = data.category;
    }

    const allItems = await Item.find(filter)
      .populate("addedBy", "name")
      .sort({ expiryDate: 1 });

    for (const item of allItems) {
      if (item.status !== "used" && item.status !== "wasted") {
        const freshStatus = computeStatus(item.expiryDate);
        if (freshStatus !== item.status) {
          item.status = freshStatus;
          await item.save();
        }
      }
    }
    return res.json({
      success: true,
      data: {
        allItems,
      },
      error: null,
    });
  } catch (e) {
    return res.status(500).json({
      success: null,
      data: null,
      error: "Internal server error",
    });
  }
});

itemRouter.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        data: null,
        error: "Invalid item id",
      });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        data: null,
        error: "Invalid item id",
      });
      return;
    }
    const item = await Item.findById(id);
    if (!item) {
      res.status(404).json({
        success: false,
        data: null,
        error: "Item not found",
      });
      return;
    }
    if (item.addedBy.toString() !== userId) {
      res.status(403).json({
        success: false,
        data: null,
        error: "Not authorized to edit this item",
      });
      return;
    }
    const { data, success } = updateItemSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        success,
        data: null,
        error: "Invalid inputs",
      });
      return;
    }
    if (data.name) item.name = data.name;
    if (data.category) item.category = data.category;
    if (data.quantity) item.quantity = data.quantity;
    if (data.expiryDate) {
      item.expiryDate = new Date(data.expiryDate);
      item.status = computeStatus(new Date(data.expiryDate));
    }
    await item.save();
    const populated = await Item.populate("addedBy", "name");
    return res.json({
      success,
      data: {
        populated,
      },
      error: null,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      data: null,
      error: "Internal server error",
    });
  }
});

itemRouter.patch(
  "/:id/status",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        res.status(400).json({
          success: false,
          data: null,
          error: "Invalid item id",
        });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Invalid item id",
        });
        return;
      }

      const { data, success } = patchItemSchema.safeParse(req.body);
      if (!success) {
        res.status(400).json({
          success,
          data: null,
          error: "Invalid input",
        });
        return;
      }

      const item = await Item.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Item not found",
        });
        return;
      }

      item.status = data.status;
      await item.save();

      const allItems = await Item.find({
        householdId: item.householdId,
        status: { $in: ["used", "wasted"] },
      });

      const usedCount = allItems.filter((i) => i.status === "used").length;
      const total = allItems.length;
      const wasteScore = total > 0 ? Math.round((usedCount / total) * 100) : 0;
      await Household.findByIdAndUpdate(item.householdId, { wasteScore });
      res.json({
        success,
        data: {
          item,
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

itemRouter.delete(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        res.status(400).json({
          success: false,
          data: null,
          error: "Invalid item id",
        });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Invalid item id",
        });
        return;
      }
      const item = await Item.findById(id);
      if (!item) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Item not found",
        });
        return;
      }
      if (item.addedBy.toString() !== userId) {
        res.status(403).json({
          success: false,
          data: null,
          error: "Not authorized to delete this item",
        });
        return;
      }
      await Item.findByIdAndDelete(id);
      res.json({
        success: true,
        data: {
          message: "Item deleted successfully"
        },
        error: null
      })
    } catch (e) {
      return res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error",
      });
    }
  },
);

export default itemRouter;
