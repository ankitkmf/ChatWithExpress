var express = require("express");
var router = express.Router();
var MongoDB = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;
var db = require('../models/db');


router.get("/data/getchat", function(req, res) {
    res.json(require("../data/countries.json"));
});