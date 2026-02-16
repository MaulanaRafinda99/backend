const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const nutritionRoutes = require("./routes/nutrition");
const dashboardAdminRoutes = require('./routes/dashboardAdmin');
const foodRoutes = require('./routes/food.routes');
const scheduleRoutes = require('./routes/schedule.route');


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/dashboardAdmin", dashboardAdminRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/schedules", scheduleRoutes);


// Uploads static folder
app.use("/uploads", express.static("uploads"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
