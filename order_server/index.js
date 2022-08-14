var express = require("express");
const order_controller = require("./controllers/ordersController");
var app = express();
var bodyParser = require('body-parser')

// create application/json parser
var jsonParser = bodyParser.json()


app.listen(4000, () => {
    console.log("Server running on port 4000");
});

app.post("/purchase/:bookId", order_controller.purchaseBook)

app.put("/orders", jsonParser, order_controller.updateOrder)