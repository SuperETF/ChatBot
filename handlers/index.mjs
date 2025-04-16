// handlers/index.js
import auth from "./auth/index.js";
import booking from "./booking/index.js";
import assignment from "./assignment/index.js";
import workout from "./workout/index.js";

export const handlers = {
  auth,
  booking,
  assignment,
  workout
};