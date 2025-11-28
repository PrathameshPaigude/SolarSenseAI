"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const predictionRoutes_1 = __importDefault(require("./predictionRoutes"));
const router = (0, express_1.Router)();
// API routes
router.use('/', predictionRoutes_1.default);
exports.default = router;
