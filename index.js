const bodyparser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const config = require('./config.json')
const port = 8080

const express = require('express');

// Import the item schema
const Item = require('./models/search');

// Connect to MongoDB

mongoose.connect(process.env['URI'], {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
// View engines & others

const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

app.engine("html", ejs.renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "/web/views"));
app.use(express.static(path.join(__dirname, "/web/public")));
     app.use(express.static('./fonts'));

app.use('/assets', express.static('qrcodes'));
app.set('json spaces', 1)

const auth = require('basic-auth');

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const user = auth(req);
  
  // Check if the user exists and has the correct credentials
  if (user && user.name === 'admin' && user.pass === 'passwor') {
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
  })
})

app.get('/home', (req, res) => {
  res.render('index', {
    title: "Home"
  })
})
app.get('/item', (req, res) => {
  res.render('item', {
    title: "Home"
  })
})

// app.get('*', (req, res) => {
//   res.render('error', { message: 'Page not found' })
// })

app.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const items = await Item.find();
        // Get the database statistics
    // const stats = await db.stats();
    // const { storageSize, dataSize } = stats;
    // const percentageUsed = ((dataSize / storageSize) * 100).toFixed(2);
    // const percentageLeft = (100 - percentageUsed).toFixed(2);
    
    res.render('admin', { items });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
})




app.get('/aboutus', (req, res) => {
  res.render('aboutus', {
    user: req.user,
    config,
    title: "About Us"
  })
})

app.get('/qr/:id', (req, res) => {
  const serialNo = req.params.id;
  
  res.render('qrpage', { serialNo })
})

app.get('/item/:id', async (req, res) => {
  try {
    const serialNo = req.params.id;
    const item = await Item.findOne({ serialNumber: serialNo });

    if (!item) {
      return res.status(404).render('error', { message: 'Item not found' });
    }

    res.render('item', { item });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

app.get('/item/edit/:id', async (req, res) => {
  try {
    const serialNo = req.params.id;
    const item = await Item.findOne({ serialNumber: serialNo });

    if (!item) {
      return res.status(404).render('error', { message: 'Item not found' });
    }

    res.render('edit', { item, serialNo });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});






app.get('/discord', (req, res) => {
  res.redirect(config.discord_server)
})

// Serve static files (including QR code images)
app.use(express.static(path.join(__dirname, 'qrcodes')));

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'products'); // Set the destination folder for uploaded images
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, fileName); // Set the file name for the uploaded image
  }
});

// Set up multer file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png') {
    cb(null, true); // Accept only PNG images
  } else {
    cb(null, false);
  }
};

// Set up multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

//posts

app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { from, to } = req.body;
    const path = req.file ? req.file.filename : '';
    const item = new Item({ name, description, path });
    await item.save();


    
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// Delete route - delete item
app.post('/admin/delete/:id', async (req, res) => {
  try {
    const result = await Item.findOneAndDelete({ serialNumber: req.params.id });

        const qrCodeFilePath = `./qrcodes/${req.params.id}.png`;

    // Delete the QR code image
    fs.unlink(qrCodeFilePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('QR code image deleted successfully');
      }
    });
    console.log("Deleted User: ", result);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// search route - search item
app.get('/search', async (req, res) => {
  try {
    const { serial } = req.query;
    
    res.redirect(`/item/${serial}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});





// Functions


function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}


app.listen(8080, () => {
  console.log("Server running on port - " + port)
  console.log("Made By Ξᴛʜᴀɴ#9632")
})



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