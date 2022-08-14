var express = require("express");
const controller = require("./controllers/controller");
var app = express();

app.listen(5000, () => {
    console.log("Server running on port 5000");
});

app.get("/search/:topicName", controller.fetchBooksByTopic)

app.get("/info/:bookId", controller.fetchBookById)
app.post("/purchase/:bookId", controller.purchaseBook)
app.delete("/invalidateBook/:bookId", controller.invalidateBooksCache)
app.delete("/invalidateTopic/:topicName", controller.invalidateTopicsCache)