const express = require("express");
const cors = require("cors");
const MongoClient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const { ObjectID } = require("bson");
const admin = require("firebase-admin");
var serviceAccount = require("./.configs/bengal-ride-firebase-adminsdk-lqf1i-5d2c250ffc.json");
require("dotenv").config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ddki.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.DB_NAME}.firebaseio.com`,
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const productsCollection = client.db("bengalRide").collection("products");
  const ordersCollection = client.db("bengalRide").collection("orders");
  console.log("database connected");

  app.get("/events", (req, res) => {
    productsCollection.find().toArray((err, items) => {
      res.send(items);
    });
  });

  app.get("/product/:id", (req, res) => {
    productsCollection
      .find({ _id: ObjectID(req.params.id) })
      .toArray((err, products) => {
        res.send(products[0]);
      });
  });

  app.post("/addOrder", (req, res) => {
    const order = req.body;
    ordersCollection.insertOne(order).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.post("/addEvent", (req, res) => {
    const newEvent = req.body;
    console.log("adding new event ", newEvent);
    productsCollection.insertOne(newEvent).then((result) => {
      console.log("inserted count ", result.insertedCount);
      res.send(result.insertedCount > 0);
    });
  });

  app.delete("/deleteProduct/:id", (req, res) => {
    productsCollection
      .deleteOne({ _id: ObjectID(req.params.id) })
      .then((result) => {
        res.send(result.deletedCount > 0);
      });
  });
  app.get("/orders", (req, res) => {
    console.log(req.query.email);
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer")) {
      const idToken = bearer.split(" ")[1]; //extracting second part
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          let tokenEmail = decodedToken.email;
          let queryEmail = req.query.email;
          if (tokenEmail == queryEmail) {
            ordersCollection
              .find({ email: req.query.email })
              .toArray((err, documents) => {
                res.send(documents);
              });
          } else {
            res.send("unauthorized access");
          }
        })
        .catch((error) => {});
    }
  });
});

app.listen(process.env.PORT || 5000);
