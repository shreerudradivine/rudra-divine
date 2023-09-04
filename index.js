const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const config = require('./config.json');
const port = 8080;

const express = require('express');

// Import the item schema
const Item = require('./models/search');

// Connect to MongoDB
mongoose.connect(process.env.URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// View engines & others
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.engine("html", ejs.renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "/web/views"));
app.use(express.static(path.join(__dirname, "/web/public")));

app.use('/assets', express.static('qrcodes'));
app.set('json spaces', 1);

const auth = require('basic-auth');

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const user = auth(req);

  // Check if the user exists and has the correct credentials
  if (user && user.name === 'admin' && user.pass === 'password') {
    return next(); // Continue to the next middleware or route handler
  }

  // If authentication fails, send a 401 Unauthorized response
  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Authentication required');
};

// Pages
app.get('/', (req, res) => {
  res.render('index', {
    title: "Home"
  });
});


app.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const items = await Item.find();
    res.render('admin', { items });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/product/:id', async (req, res) => {
  try {
    const product = req.params.id;
    res.render('product', { product });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});




// Serve static files (including QR code images)
app.use(express.static(path.join(__dirname, 'products')));

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'tmp/'); // Set the destination directory for uploaded images
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, fileName);
  },
});

// Set up multer upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG images are allowed'));
    }
  },
});

// Add the upload middleware to the route
app.post('/admin/add', upload.single('file'), async (req, res) => {
  try {
    const { from, to } = req.body;
    const imagePath = req.file ? req.file.filename : 'fail';

    const item = new Item({ from: from, to: to, path: imagePath });
    await item.save();

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Delete route - delete item
app.post('/admin/delete/:id', async (req, res) => {
  try {
    const result = await Item.findOneAndDelete({ path: req.params.id });
    const iFilePath = `./products/${req.params.id}.png`;

    // Delete the image
    fs.unlink(iFilePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('Image deleted successfully');
      }
    });

    console.log("Deleted User: ", result);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Search route - search item
app.get('/search', async (req, res) => {
  try {
    const { number } = req.query;
    const items = await Item.find({}); // Retrieve all items from the database

    let foundItem = null;
    for (const item of items) {
      if (number > item.from && number < item.to) {
        console.log("Success");
        foundItem = item;
        break;
      }
    }

    if (foundItem) {
      const path = foundItem.path;
      res.redirect(`/product/${path}`);
    } else {
      res.status(404).render('error', { message: 'Item not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log("Server running on port - " + port);
  console.log("Made By Ξᴛʜᴀɴ#9632");
});

process.on('unhandledRejection', (reason, p) => {
  console.log(' [antiCrash] :: Unhandled Rejection/Catch');
  console.log(reason, p);
});
process.on('uncaughtException', (err, origin) => {
  console.log(' [antiCrash] :: Uncaught Exception/Catch');
  console.log(err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
  console.log(err, origin);
});
process.on('multipleResolves', (type, promise, reason) => {
  console.log(' [antiCrash] :: Multiple Resolves');
  console.log(type, promise, reason);
});
