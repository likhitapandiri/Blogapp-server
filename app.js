const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/user');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs'); //to encrypt the password
const app = express();
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
app.use('/uploads', express.static(__dirname + '/uploads'));

const multer = require('multer');

const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const salt = bcrypt.genSaltSync(10); //to hash the password the more the number ,more secure the password is
const secret = 'wiughhhhhhhhhhhhhhhha67q7qtys';
app.use(express.json());//middleware for parsing data got from put or post method from clients in terms of json
app.use(cookieParser());
//app.use(cors({credentials:true,origin:'http://localhost:3000'}));
const allowedOrigins = ['http://localhost:3000', 'https://blog-application123.netlify.app'];

app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Your CORS policy does not allow this origin.'));
    }
  }
}));
app.use(morgan('tiny'));
//blogapp-likhita
//1sTBAmodUo7Q5Inc
mongoose
  .connect(
    "mongodb+srv://likhitapandiri112:1sTBAmodUo7Q5Inc@cluster0.dlimv4a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(err);
  });
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({
            username,
            password:bcrypt.hashSync(password,salt),
        });//to create a new user data in database
        res.json(userDoc);
    } catch (e) {
        console.log(e);
        res.status(400).json(e);
    }


   
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const userDoc = await User.findOne({ username }); //password is encrypeted so cannot exactly find
  if (!userDoc) {
    // User not found, return appropriate error response
    return res.status(400).json("Wrong credentials");
  }
    const passOk=bcrypt.compareSync(password, userDoc.password);//to check password
    if (passOk) {
      //logged in
      //jwt.sign-to create json web token and then sending the token 
      //as cookie in http response
        jwt.sign({ username, id:userDoc._id }, secret , {}, (err,token) => { //secret is another salt
            if (err) throw err;
            res.cookie('token', token).json({ 
                id: userDoc._id,
                username,
            });
        });
        //rels.json();
    }
    else {
        res.status(400).json('wrong credentails');
    }
    

   
});

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (!token) {
        res.json({ message: "Not Signed In user" });
    }
    else {
        jwt.verify(token, secret, {}, (err, info) => {
            if (err) throw err;
            res.json(info);
        });
    }
});
//endpoint for post req
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
   
  const newPath = path + '.' + ext;
 // const newPath = `/uploads/${req.file.filename}.${ext}`;
  fs.renameSync(path, newPath);
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { title, summary, content } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    });

  }
    
  
});

  // app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  //   try {
  //     const { originalname, path } = req.file;
  //     const parts = originalname.split(".");
  //     const ext = parts[parts.length - 1];

  //     // Construct the new file path manually
  //     const newPath = `${__dirname}/uploads/${req.file.filename}.${ext}`;

  //     // Ensure the destination directory exists
  //     const destDir = `${__dirname}/uploads`;
  //     if (!fs.existsSync(destDir)) {
  //       fs.mkdirSync(destDir, { recursive: true });
  //     }

  //     // Rename the file
  //     fs.renameSync(path, newPath);

  //     const { token } = req.cookies;
  //     if (token) {
  //       jwt.verify(token, secret, {}, async (err, info) => {
  //         if (err) throw err;
  //         const { title, summary, content } = req.body;
  //         const postDoc = await Post.create({
  //           title,
  //           summary,
  //           content,
  //           cover: newPath,
  //           author: info.id,
  //         });
  //         res.json(postDoc);
  //       });
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // });




app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});
app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});
app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})


app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok');
})

// app.get('/', (req,res) => {
//     res.status(200).json({
//         hello: "hello"
//     });
// })
// app.listen(8080, () => {
//     console.log("server is running");
// });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
//ZdrpX441cAF721F6
