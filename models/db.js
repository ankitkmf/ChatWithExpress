var MongoClient = require('mongodb').MongoClient;
var ObjectId = require("mongodb").ObjectID;

var state = {
    db: null,
    //hash: null,
}

exports.url = 'mongodb://vaskar:vaskar@ds143754.mlab.com:43754/livechat';

exports.connect = function(url, done) {
    if (state.db) return done()

    MongoClient.connect(url, function(err, db) {
        if (err) return done(err)
        state.db = db
        done()
    })
}

exports.get = function() {
    return state.db
}

function getConnection() {
    return state.db
}

exports.update = function(collection, findQuery, updateQuery) {
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection).update(findQuery, { $set: updateQuery }, { upsert: true },
            (err, results) => {
                if (!err) {
                    resolve(results);
                } else {
                    reject(err);
                }
            });
    });
}

exports.findOne = function(collection, filter) {
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection)
            .findOne(filter, (err, results) => {
                if (!err) {
                    resolve(results);
                } else {
                    reject(err);
                }
            });
    });
}

exports.findAllUser = function(collection) {
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection)
            .find().toArray(function(err, results) {
                if (!err) {
                    resolve(results);
                } else {
                    reject(err);
                }
            });
    });
}

exports.InsertChat = function(collection, filter) {
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection)
            .save(filter, (err, results) => {
                if (!err) {
                    var data = {
                        "resultID": ((results.ops[0])._id).toString(),
                        "count": 1
                    };
                    resolve(data);
                } else {
                    reject(err);
                }
            });
    });
}

exports.InsertUser = function(collection, filter) {
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection)
            .save(filter, (err, results) => {
                if (!err) {
                    // console.log("1");
                    // console.log(JSON.stringify(results));
                    // console.log("1.1:" + results.result);
                    // console.log("1.2:" + results.result.upserted[0]._id);
                    // console.log("2");
                    var data = {
                        "resultID": results.result.upserted[0]._id, // results.upserted[0]._id,
                        "count": 1
                    };
                    resolve(data);
                } else {
                    reject(err);
                }
            });
    });
}

exports.findAllUnreadMegCount = function(collection, whereFilter) {
    return new Promise(function(resolve, reject) {
        console.log("whereFilter1:" + JSON.stringify(whereFilter));
        getConnection().collection(collection).find(whereFilter).count(function(err, count) {
            // getConnection().collection(collection).findOne(whereFilter, function(err, count) {
            if (!err) {
                console.log("Count:" + JSON.stringify(count));
                resolve(count);
            } else {
                reject(err);
            }
        });
    });
}

exports.getAllUserUnreadMsgCount = function(collection) {
    return new Promise(function(resolve, reject) {
        getConnection().collection('users').aggregate([{
                $lookup: {
                    from: 'chats',
                    localField: '_id',
                    foreignField: 'senderID',
                    as: 'childs'
                }
            },
            {
                $project: {
                    item: 1,
                    name: 1,
                    image: 1,
                    //  numberOfColors: { $size: "$childs" },
                    "childs": {
                        "$filter": {
                            "input": "$childs",
                            "as": "child",
                            "cond": { "$eq": ["$$child.isRead", false] }
                        }
                    }
                    // $match: { 'childs.isRead': false }
                }
            }
        ], function(err, res) {
            if (err) reject(err);
            resolve(res);
            //  console.log("test collection:" + JSON.stringify(res));
            //  db.close();
        });
    });
}

exports.find = function(collection, filter1, filter2) {

    filter2 = filter2 != null ? filter2 : {};
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection).find(filter2, filter1).toArray(function(err, results) {
            if (!err) {
                resolve(results);
            } else {
                reject(err);
            }
        });
    });
}

exports.findAllChat = function(collection, whereFilter, dataFilter) {

    // filter2 = filter2 != null ? filter2 : {};
    return new Promise(function(resolve, reject) {
        getConnection().collection(collection).find(whereFilter, dataFilter)
            .limit(100)
            .sort({ _id: 1 })
            .toArray(function(err, results) {
                if (!err) {
                    resolve(results);
                } else {
                    reject(err);
                }
            });
    });
}

exports.close = function(done) {
    if (state.db) {
        state.db.close(function(err, result) {
            state.db = null
            state.mode = null
            done(err)
        })
    }
}