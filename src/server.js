import "dotenv/config";
import express from "express";
import logger from "morgan";
import { faker } from "@faker-js/faker";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import { auth_setup, login_return_token } from "./auth.js";
import { DB_CRUD } from "./database.js";
import passport from "passport";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const username = process.env["DB_USERNAME"];
const pwd = encodeURIComponent(process.env["PASSWORD"]);

const DB_URL = `mongodb+srv://${username}:${pwd}@cluster0.ycngz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const DB_NAME = "foodandumass";
const salt = process.env["SALT"];

const db_crud = new DB_CRUD();
await db_crud.connect(DB_URL, DB_NAME);

const dining_hall = ["hampshire", "franklin", "berkshire", "worcester"];
const app = express();
const port = process.env.PORT || 3000;
const storage = new GridFsStorage({
    url: DB_URL,
    db: db_crud.db,
    file: (req, file) => {
        return {
            bucketName: "image",
            filename: file.originalname,
        };
    },
});

const upload = multer({ storage });

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/", express.static(join(__dirname, "client")));

const fake_user = {
    id: 0,
    name: faker.name.findName(),
    pfp_id: faker.datatype.uuid(),
    password: faker.animal.type(),
};

const fake_review_1 = {
    id: faker.datatype.uuid(),
    user_id: 0,
    user_name: faker.name.findName(),
    review_text: faker.lorem.paragraph(),
    review_num: faker.datatype.number(100),
    review_img_id: faker.datatype.uuid(),
    rating: faker.datatype.number({ min: 1, max: 5 }),
    created_date: faker.date.past(),
    location: faker.random.arrayElement(dining_hall),
};

const fake_review_2 = {
    id: faker.datatype.uuid(),
    user_id: 0,
    user_name: faker.name.findName(),
    review_text: faker.lorem.paragraph(),
    review_num: faker.datatype.number(100),
    review_img_id: faker.datatype.uuid(),
    rating: faker.datatype.number({ min: 1, max: 5 }),
    created_date: faker.date.past(),
    location: faker.random.arrayElement(dining_hall),
};

const fake_review_3 = {
    id: faker.datatype.uuid(),
    user_id: 0,
    user_name: faker.name.findName(),
    review_text: faker.lorem.paragraph(),
    review_num: faker.datatype.number(100),
    review_img_id: faker.datatype.uuid(),
    rating: faker.datatype.number({ min: 1, max: 5 }),
    created_date: faker.date.past(),
    location: faker.random.arrayElement(dining_hall),
};

const fake_image_id = {
    id: faker.datatype.uuid(),
};

const FILE_PATH = "/client/img/food.png";

const fake_review_list = [fake_review_1, fake_review_2, fake_review_3];

// app.get('/', async (request, response) => {
//     response.send('Hello World!');
// })

// USERS
app.put("/user/update", async (request, response) => {
    const options = request.body;
    if ("username" in options && "password" in options && "img_id" in options) {
        await db_crud.updateUser(
            options.username,
            options.password,
            options.img_id
        );
        response.status(200).json(options.username);
    } else {
        response.status(400).json({ error: "Bad Requset: Missing params" });
    }
});

app.delete("/user/delete", async (request, response) => {
    try {
        const { username } = req.query;
        const user = await db_crud.deletUser(username);
        response.status(200).json(user);
    } catch (err) {
        response.status(500).send(err);
    }
});

app.get("/user", async (request, response) => {
    try {
        const options = request.query;
        const user_token = options.token;
        const user_id = options.id;
        if (user_token === undefined) {
            // GetUserWithId
            const user = await db_crud.getUser(user_id);
            response.status(200).json(user);
        } else {
            // GetUserWithJWTToken
            const decoded = jwt.verify(user_token, salt);
            const user_id_decoded = decoded.user._id;
            const user = await db_crud.getUser(user_id_decoded);
            response.status(200).json(user);
        }
    } catch (err) {
        response.status(500).send(err);
    }
});

// example auth route for getting all users
app.get(
    "/users",
    passport.authenticate("jwt", { session: false }),
    async function (request, response) {
        const users = await db_crud.getUsers();
        response.status(200).json(users);
    }
);

// return all the reviews post by this user
// app.get('/user/reviews', async (request, response) => {
//     const options = request.query;
//     response.status(200).json(fake_review_list);
// });

// setup passport local strategy
await auth_setup();

app.post("/user/login", login_return_token);

app.post("/user/register", async (request, response) => {
    const options = request.body;
    if ("username" in options && "password" in options && "img_id" in options) {
        const user = {
            username: options.username,
            password: options.password,
            img_id: options.img_id,
        };
        // to do handle images
        await db_crud.addUserToDB(user);

        response.status(200).json(user).redirect("/user/login");
    } else {
        response.status(400).json({ error: "Bad Requset: Missing params" });
    }
});

// REVIEWS
app.post("/review/create", async (request, response) => {
    try {
        const options = request.body;
        const user_id = options.user_id;
        const rating = options.rating;
        const location = options.location;
        const review_text = options.review_text;
        const visited_date = options.visited_date;
        const review_img_id = options.review_img_id;
        const result = await db_crud.addReview({
            user_id: user_id,
            rating: rating,
            location: location,
            review_text: review_text,
            visited_date: visited_date,
            review_img_id: review_img_id,
        });
        response.status(200).json(result);
    } catch (err) {
        response.status(500).send(err);
    }
});

app.get("/review", async (request, response) => {
    try {
        const options = request.query;
        const review_id = options.id;
        const result = await db_crud.getReview(review_id);
        response.status(200).json(result[0]);
    } catch (err) {
        response.status(500).send(err);
    }
});

app.get("/review/userid", async (request, response) => {
    try {
        const options = request.query;
        const user_id = options.id;
        const result = await db_crud.getReviewByUserID(user_id);
        result.reverse();
        response.status(200).json(result);
    } catch (err) {
        response.status(500).send(err);
    }
});

app.get("/review/location", async (request, response) => {
    try {
        const location = request.query.name;
        let result = await db_crud.getReviewByLocation(location);
        if (location === "index") {
            result = result.slice(-5);
        }
        result.reverse();
        response.status(200).json(result);
    } catch (err) {
        console.log(err);
        response.status(500).send(err);
    }
});

app.put("/review/update", async (request, response) => {
    try {
        const options = request.body;
        const review_id = options.review_id;
        const rating = options.rating;
        const location = options.location;
        const review_text = options.review_text;
        const visited_date = options.visited_date;
        const result = await db_crud.updateReview(review_id, {
            rating: rating,
            location: location,
            review_text: review_text,
            visited_date: visited_date,
        });
        response.status(200).json(result);
    } catch (err) {
        console.log("update review", err);
        response.status(500).send(err);
    }
});

app.delete("/review/delete", async (request, response) => {
    try {
        const options = request.body;
        const review_id = options.review_id;
        const img_id = (await db_crud.getReview(review_id))[0].review_img_id;
        const result = await db_crud.deleteReview(review_id);
        if (
            result.acknowledged &&
            result.deletedCount === 1 &&
            img_id !== null
        ) {
            const image = await db_crud.checkImage(id);
            if (image.length !== 0) {
                await db_crud.deleteImage(img_id);
            }
        }
        response.status(200).json(result);
    } catch (err) {
        console.log("review delete", err);
        response.status(500).send(err);
    }
});

// IMAGE
app.post(
    "/image/create",
    upload.single("image"),
    async function (req, response) {
        if (req.file === undefined || req.file.id === undefined) {
            response.status(400).json({ error: "Bad Requset: Missing params" });
        } else {
            response.status(200).json({ id: req.file.id });
        }
    }
);

app.get("/image", async function (req, response) {
    const id = req.query.id;
    if (id === undefined || id === null) {
        response.status(400).json({ error: "Bad Requset: Missing params" });
    } else {
        const image = await db_crud.checkImage(id);
        if (image.length === 0) {
            response
                .status(400)
                .json({ error: "Bad Requset: Image not exist" });
        } else {
            db_crud.getImage(id).pipe(response);
        }
    }
});

app.delete("/image/delete", async function (req, response) {
    const id = req.body.id;
    if (id === undefined || id === null) {
        response.status(400).json({ error: "Bad Requset: Missing params" });
    } else {
        const image = await db_crud.checkImage(id);
        if (image.length === 0) {
            response
                .status(400)
                .json({ error: "Bad Requset: Image not exist" });
        } else {
            await db_crud.deleteImage(id);
            response.status(200).json({ id: id });
        }
    }
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
