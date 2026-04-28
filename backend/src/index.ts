import express from "express";
import authRouter from "./routes/auth.routes";
import householdRouter from "./routes/household.routes";
import itemRouter from "./routes/item.routes";
import dashboardRouter from "./routes/dashboard.route";

const app = express();
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/households", householdRouter);
app.use("/api/items", itemRouter);
app.use("/api/dashboard", dashboardRouter);


app.listen(3000);