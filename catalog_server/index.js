var express = require("express");
const catalog_controller = require("./controllers/catalogController");
var app = express();
var bodyParser = require('body-parser')

// create application/json parser
var jsonParser = bodyParser.json()

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get("/search/:topicName", catalog_controller.fetchBooksByTopic)

app.get("/info/:bookId", catalog_controller.fetchBookById)

app.put("/books", jsonParser, catalog_controller.updateBookById)