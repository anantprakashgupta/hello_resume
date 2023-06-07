const express = require('express');
const session = require('express-session');
const twilio = require('twilio');
const axios = require('axios');
const app = express();
// const http = require('http');
const http = require('http').Server(app);
const io = require('socket.io')(http);


const path = require('path');
app.use(express.static(__dirname, + '/public'));
const mysql = require('mysql');
const bodyParser = require('body-parser');
app.use(express.static('assets'));
const { name } = require('ejs');
// //////////// pdf /////////////////////////

/////////////////////////////////////////////////////////
const port = 3000;
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.get('/resume_form', (req, res) => {
  res.render('resume_form');
});

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/index', (req, res) => {
  res.render('index');
});

app.get('/show_resume', (req, res) => {
  res.render('show_resume');
});

app.get('/user', (req, res) => {
  res.render('user');
});


app.get('/register', (req, res) => {
  res.render('register');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/profile_pic', (req, res) => {
  res.render('profile_pic');
});
app.get('/admin', (req, res) => {
  res.render('admin');
});



app.get('/delete_userid', (req, res) => {
  res.render('delete_userid');
});
app.get('/verify_otp', (req, res) => {
  res.render('verify_otp');
});
app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/show_resume', (req, res) => {
  res.render('show_resume');
});

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root@123',
  database: 'resume'
});

//////////////////////////   register ////////////////////////

app.post('/checkUsername', (req, res) => {
  const userid = req.body.userid;
  // console.log("duplicate =",userid);

  pool.query('SELECT * FROM resume WHERE userid = ?', [userid], (err, results) => {
    // console.log("kya h",results);
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (results.length > 0) {
        res.status(200).json({ error: ' already exists', userid: userid });
      } else {
        res.status(200).json({ message: ' is available', userid: userid });
      }
    }
  });
});

app.post('/register', (req, res) => {
  const username = req.body.name;
  const userid = req.body.userid;
  const email = req.body.email;
  const mobile = req.body.mobile;
  const password = req.body.password;

  console.log("register data", username);

  pool.query('INSERT INTO login (username, userid, email, mobile, password, status) VALUES (?, ?, ?, ?, ?, ?)', [username, userid, email, mobile, password, "1"], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      // Redirect to the login page with a success message
      res.render('login', { message: 'Registration successful' });
    }
  });

  // Insert userid into the resume table
  pool.query('INSERT INTO resume (userid) VALUES (?)', [userid], (err, result) => {
    if (err) {
      console.error(err);
    }
  });
});



/////////////////// login //////////////////

app.post('/login_api', (req, res) => {
  const { userid, password } = req.body;
  const query = `SELECT * FROM login WHERE userid = ? AND status='1'`;
  pool.query(query, [userid], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      const user = results[0];

      if (user.password === password) {
        req.session.userid = user;
        res.redirect('/role_chek');
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      res.status(401).json({ error: 'Invalid userid' });
    }
  });
});



let globalUserId = '';
////////////  login check if login then next /////////////
function requireLogin(req, res, next) {

   if (req.session.userid == null){
    // res.redirect('/login');
  } else {
    next();
  }
}
 // Declare the global variable

app.get('/role_chek', (req, res) => {
  if (req.session.userid) {
    const role = req.session.userid.role;
    console.log("roleeeeeeee", role);
    const username = req.session.userid.username;
    globalUserId = req.session.userid.userid; 

    if (role === 'admin') {
      res.render('admin', { username });
    } else {
      res.render('user', { username });
    }
  } else {
    res.redirect('/');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});


////////////////  profile pic api ////////////

app.get('/profile_pic2', function(req, res) {
  // const query = `SELECT * FROM resume`;
   const query = `SELECT username, profile_pic FROM login WHERE userid = '${globalUserId}'`;
  pool.query(query, function(error, results, fields) {
    if (error) {
      console.log(error);
      res.status(500).send('Error retrieving images from the database.');
      return;
    }

    const images = results.map(result => ({
        username: result.username,
        data: result.profile_pic ? result.profile_pic.toString('base64') : ''
    }));
    res.send(images);
    // console.log(images);
  });
});



//////////////////// opt send for forget password  ///////////////////////

const accountSid = 'AC6d38423b3ee1457c117d0977bf0673d9';
const authToken = '93dce84e808d88797adf4337ed72e069';
const client = twilio(accountSid, authToken);

app.get('/', (req, res) => {
  res.render('resetPassword'); 
});

app.get('/newPassword', (req, res) => {
  res.render('newPassword'); 
});


app.get('/resetPssword', (req, res) => {
   const otpExpiry = JSON.parse(req.query.otpExpiry);
    res.render('resetPassword', { otpExpiry });
});

app.post('/send-otp', (req, res) => {
    const { mobile } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    const updateQuery = "UPDATE login SET otp = ?, otp_expiry = ? WHERE mobile = ?";
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // 10 minutes in milliseconds
    
    connection.query(updateQuery, [otp, otpExpiry, mobile], (updateError) => {
        if (updateError) {
            console.error('Error updating OTP:', updateError);
            res.status(500).send('Internal Server Error');
        } else {
            // Send the OTP via SMS using Twilio
            client.messages
                .create({
                    body: `Your OTP for password reset is: ${otp}`,
                    from: '12543182639',
                    to: mobile
                })
                .then(() => {
                  const otpExpiryString = otpExpiry.toISOString();
                  console.log(otp);
                  res.json(otpExpiryString);
                    
                    // Clear the OTP after 10 minutes
                    setTimeout(() => {
                        const clearQuery = "UPDATE login SET otp = NULL, otp_expiry = NULL WHERE mobile = ?";
                        connection.query(clearQuery, [mobile], (clearError) => {
                            if (clearError) {
                                console.error('Error clearing OTP:', clearError);
                            }
                        });
                    }, 1 * 60 * 1000); // 10 minutes in milliseconds
                })
                .catch((err) => {
                    console.error('Error sending OTP:', err);
                    res.status(500).send('Failed to send OTP');
                });
        }
    });
});

/////////////////////////////////////////////////

app.post('/verify_otp', (req, res) => {
  const { otp } = req.body;
  const query = "SELECT * FROM login WHERE otp = ?";
  connection.query(query, [otp], (error, results) => {
    if (error) {
      console.error('Error fetching user data:', error);
      res.status(500).send('Internal Server Error');
    } else {
      // Check if a user with the provided mobile number exists
      if (results.length === 0) {
        res.status(404).send('User not found');
      } else {
         const savedOtp = results[0].otp; // Convert savedOtp to string
          console.log("otp is ", savedOtp);
         
        if (otp === savedOtp) {
         
           res.render('login');
        } else { 
          res.status(400).send('Invalid OTP');
        }
        
      }
    }
  });
});

//////////////////    new passowrd //////////////

app.post('/update_password', (req, res) => {
 
  const password = req.body.password;
  const userId = req.body.userid;

  const query = 'UPDATE login SET password = ? WHERE userid = ?';
  connection.query(query, [password, userId], (error, results) => {
    if (error) {
      console.error('Error updating password:', error);
      res.status(500).send('Error updating password');
    } else {
      console.log('Password updated successfully');
      res.send('Password updated successfully');
    }
  });
});

////////////// delete user id //////////
app.post('/delete_userid', (req, res) => {
  const query = 'UPDATE login SET status = ? WHERE userid = ?';
  pool.query(query, ['0', globalUserId], (error, results) => {
    if (error) {
      console.error('Error delete password:', error);
      res.status(500).send('Error delete password');
    } else {
      console.log(' delete successfully', results);
      res.send(' delete successfully');
    }
  });
});



/////////////////  upload resume data ////////////////


app.post('/upload', requireLogin, (req, res) => {
  const name = req.body.name;
  const address = req.body.address;
  const mobile = req.body.mobile;
  const email = req.body.email;
  const father_name = req.body.father_name;
  const dob = req.body.dob;
  const religion = req.body.religion;
  const nationality = req.body.nationality;
  const skills = req.body.skills;
  const sex = req.body.sex;
  const experience = req.body.experience;
  const language = req.body.language;
  const hobby = req.body.hobby;
  const matric = req.body.matric;
  const intermediate = req.body.intermediate;
  const graduation = req.body.graduation;
 
  console.log("exxx", sex);

  // Update query
  const updateQuery = `UPDATE resume SET name = ?, address = ?, mobile = ?, email = ?, father_name = ?, dob = ?, religion = ?, nationality = ?, skills = ?, sex = ?, experience = ?, language = ?, hobby = ?, matric = ?, intermediate = ?, graduation = ? WHERE userid = ?`;
  const values = [
    name,
    address,
    mobile,
    email,
    father_name,
    dob,
    religion,
    nationality,
    skills,
    sex,
    experience,
    language,
    hobby,
    matric,
    intermediate,
    graduation,
    globalUserId
  ];

  pool.query(updateQuery, values, (error, results) => {
    // console.log(results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      res.send(results);
    }
  });
});

/////////////////////  resume image update ////////

app.post('/update_resume_photo2', (req, res) => {
  const imageBase64 = req.body.imageBase64;
  const buffer = Buffer.from(imageBase64, 'base64');
  
  // Update query
  const updateQuery = `UPDATE resume SET image = ? WHERE userid = ?`;
  const values = [
    buffer,
    globalUserId
  ];

  pool.query(updateQuery, values, (error, results) => {
    // console.log("resume photo", results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      res.send(results);
    }
  });
});



////////////////////////  display image  //////////////////////
// var userid = "pk";
app.get('/show',requireLogin, function(req, res) {
  // const query = `SELECT * FROM resume`;
   const query = `SELECT resume.* FROM login INNER JOIN resume ON login.userid = resume.userid WHERE login.userid = '${globalUserId}'`;


  pool.query(query, function(error, results, fields) {
    if (error) {
      console.log(error);
      res.status(500).send('Error retrieving images from the database.');
      return;
    }

    const images = results.map(result => ({
        id: result.id,
        name: result.name,
        address: result.address,
        dob: result.dob,
        email: result.email,
        mobile: result.mobile,
        father_name: result.father_name,
        religion: result.religion,
        nationality: result.nationality,
        sex: result.sex,
        language: result.language,
        hobby: result.hobby,
        skills: result.skills,
        experience: result.experience,
        matric: result.matric,
        intermediate: result.intermediate,
        graduation: result.graduation,
        data: result.image ? result.image.toString('base64') : ''
    }));
    res.send(images);
  });
});

///////////////  profile pic & name update ////////////////

app.post('/profile_update_api', requireLogin, (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const mobile = req.body.mobile;
  const email = req.body.email;
  const updateQuery = `UPDATE login SET username = ?, mobile = ?, email = ?, password = ? WHERE userid = ?`;
  const values = [
    username,
    mobile,
    email,
    password,
    globalUserId
  ];

  pool.query(updateQuery, values, (error, results) => {
    // console.log(results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      res.send(results);
    }
  });
});

/////////////////////  profile dp update /////////

app.post('/profile_update_DP', requireLogin, (req, res) => {
  const imageBase64 = req.body.imageBase64;
 
  const buffer = Buffer.from(imageBase64, 'base64');
  const updateQuery = `UPDATE login SET  profile_pic = ? WHERE userid = ?`;
  const values = [
    buffer,
    globalUserId
  ];

  pool.query(updateQuery, values, (error, results) => {
    // console.log(results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      res.send(results);
    }
  });
});
//////////////////  view profile data in input field ////////////////
app.post('/profile_viewData_api', (req, res) => {
  const updateQuery = `SELECT username, password, email, mobile FROM login WHERE userid = ?`;
  const values = [globalUserId];

  pool.query(updateQuery, values, (error, results) => {
    // console.log("data",results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const user = results[0]; // Assuming only one user is returned
      res.json( user );
    }
  });
});

//////////////////  view resume data in input field ////////////////
app.post('/resume_data_view_input_field', (req, res) => {
  const updateQuery = `SELECT * FROM resume WHERE userid = ?`;
  const values = [globalUserId];

  pool.query(updateQuery, values, (error, results) => {
    console.log("data",results);
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const user = results[0]; // Assuming only one user is returned
      res.json( user );
    }
  });
});
/////////////////// pdf  ////////////////////////
app.get('/resume_pdf', (req, res) => {
   const updateQuery = `SELECT * FROM resume WHERE userid = ?`;
  const values = [globalUserId];
  pool.query(updateQuery, values, (error, results) => {
    
    ///////////////////////// pdfkit code ///////////////////////////

    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4' });
      const fs = require('fs');
      const stream = fs.createWriteStream('resume.pdf');
      doc.page.margins = { top: 30, bottom: 30, left: 30, right: 30 };
      doc.pipe(stream);
      var experience2 = results[0].experience;
    // Extract data from the results
    const {
      name,
      address,
      mobile,
      email,
      dob,
      // experience,
      father_name,
      nationality,
      sex,
      language,
      religion,
      hobby,
      skills,
      matric,
      intermediate,
      graduation,
      image
    } = results[0];
      doc.fontSize(12);
doc.lineGap(1);

   
// Define the border properties
const borderWidth = 1;
const borderColor = '#00000'; // Red color

// Calculate the coordinates of the border box
const boxX = doc.page.margins.left;
const boxY = doc.page.margins.top;
const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const boxHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

const education = [
  { degree: '10th', details: `${matric}\n` },
  { degree: '12th', details: `${intermediate}\n` },
  { degree: 'Graduation', details: `${graduation}\n` },
];
const personalDetails = [
  { label: 'Father Name:', value: `${father_name}` },
  { label: 'DOB:', value: `${dob}` },
  { label: 'Gender:', value: `${sex}` },
  { label: 'Religion:', value: `${religion}` },
  { label: 'Nationality:', value: `${nationality}` },
];
const experience = [
  { company: `${experience2}`, position: 'Senior Interface Designer', year: '2005-2007', details: 'Experience details\n' },
];


// Define the style for the headings
const headingStyle = {
  fillColor: '#6C6A6A', // Red color
  textColor: '#FFFFFF', // White color
  fontSize: 14,
  fontWeight: 'bold',
  padding: 5,
  align: 'center',
};

// Draw the outer border
doc.lineWidth(borderWidth)
  .rect(boxX, boxY, boxWidth, boxHeight)
  .stroke(borderColor);

// Set the clipping region to the inside of the border box
doc.save()
  .clip()
  .lineWidth(1); // Reset the line width to the default value

// Add personal information
doc.font('Helvetica-Bold').text(`Name: ${name}`);
doc.font('Helvetica-Bold').text(`Address: ${address}`);
doc.font('Helvetica-Bold').text(`Email: ${email}`);
doc.font('Helvetica-Bold').text(`Mobile: ${mobile}`);

// Add photo
      // Assuming the image data is stored in the 'image' variable as a base64 encoded string
const imageBuffer = Buffer.from(image, 'base64');
const photoWidth = 100;
const photoHeight = 100;
doc.image(imageBuffer, boxX + boxWidth - photoWidth - 10, boxY + 10, { width: photoWidth, height: photoHeight });

// Add skills section
doc.moveDown();
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Skills', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();
doc.fillColor('#000000') // Reset text color to black
  .text(skills, boxX + 40, doc.y); // Add 50 pixels margin from the left

// Add education section
// Add education section
doc.moveDown();
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Education', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();

const table = {
  headers: ['Degree', 'Details'],
  rows: education.map((edu) => [edu.degree, edu.details]),
  rowCount: education.length,
  columnSpacing: 200,
  rowSpacing: 20,
  topMargin: doc.y + 20,
};

// Calculate the width of each column
const columnWidth = (boxWidth - table.columnSpacing) / table.headers.length;

// Draw the table headers
table.headers.forEach((header, columnIndex) => {
  doc.font('Helvetica-Bold')
    .fillColor('#00000') // Change text color to red
    .text(header, boxX + doc.page.margins.left + columnIndex * columnWidth, doc.y);
});

// Draw the table rows
// Draw the table rows
table.rows.forEach((row, rowIndex) => {
  const startY = table.topMargin + (rowIndex + 1) * table.rowSpacing + rowIndex * doc.currentLineHeight();
  row.forEach((cell, columnIndex) => {
    const textX = boxX + doc.page.margins.left + columnIndex * columnWidth;
    const textY = columnIndex === 1 ? startY + doc.currentLineHeight() - 5 : startY; // Adjust the value -5 to add a margin
    doc.font('Helvetica')
      .fillColor('#00000') // Change text color to red
      .text(cell, textX, textY);
  });

  // Draw a full-width horizontal line after each row
  doc.lineWidth(1).moveTo(boxX, startY + doc.currentLineHeight() + table.rowSpacing / 2).lineTo(boxX + boxWidth, startY + doc.currentLineHeight() + table.rowSpacing / 2).stroke();
});


// Add personal details section
doc.moveDown(0.5); // Adjust the parameter to reduce the line break gap

// Add personal details section
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Personal Details', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();

personalDetails.forEach(({ label, value }) => {
  doc.fillColor('#000000') // Reset text color to black
    .font('Helvetica-Bold')
    .text(`${label}: ${value}`, boxX + doc.page.margins.left, doc.y, { align: 'left' });
  doc.moveDown(0.5); // Adjust the parameter to reduce the line break gap
});


// Add experience section
// Add experience section
doc.moveDown();
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Experience', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();

experience.forEach(({ company, position, year, details }) => {
  doc.fillColor('#000000') // Reset text color to black
    .font('Helvetica-Bold')
    .text(`• ${company}`, boxX + doc.page.margins.left);
  doc.font('Helvetica')
    .text(`  ${position}`, boxX + doc.page.margins.left);
  doc.font('Helvetica-Bold')
    .text(`  ${year}`, boxX + doc.page.margins.left);
  doc.font('Helvetica')
    .text(`  ${details}`, boxX + doc.page.margins.left);
});


// Add language section
doc.moveDown();
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Language', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();
doc.fillColor('#000000') // Reset text color to black
  // .text(language, boxX + 50, doc.y); // Add 50 pixels margin from the left

  const languages = language.split(',').map(lang => lang.trim());
doc.list(languages, boxX + 50, doc.y, { bulletRadius: 3, textIndent: 20, bulletIndent: 15 });


// doc.moveDown();
// Add hobby section
doc.moveDown();
doc.rect(boxX, doc.y, boxWidth, 20) // Draw the border box
  .fillColor(headingStyle.fillColor)
  .fill();
doc.fillColor('#FFFFFF')
  .font('Helvetica-Bold')
  .fontSize(12)
  .text('Hobby', boxX, doc.y + 5, { align: 'center', width: boxWidth });
doc.moveDown();
doc.fillColor('#000000') // Reset text color to black
  // .text(hobby, boxX + 50, doc.y);

const hobbies = hobby.split(',').map(hob => hob.trim());
doc.list(hobbies, boxX + 50, doc.y, { bulletRadius: 3, textIndent: 20, bulletIndent: 15 });
   res.setHeader('Content-Disposition', 'attachment; filename=example.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);
// Restore the clipping region
doc.restore();
// Finalize the PDF document
    doc.end();
      
    }
  });
});
 
///////////////  user count ////////////
app.use((req, res, next) => {
  res.locals.userCount = connectedUsers.size;
  next();
});

let connectedUsers = new Set();

io.on('connection', (socket) => {
  // Add the connected user to the set
  connectedUsers.add(socket.id);
  io.emit('userCount', connectedUsers.size);

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove the disconnected user from the set
    connectedUsers.delete(socket.id);

    // Emit the updated count of connected users to all clients
    io.emit('userCount', connectedUsers.size);
  });
});

app.get('/user_count', (req, res) => {
  res.json({ userCount: connectedUsers.size });
});

/////////////////////// user permission for login by amin api  //////////

app.post('/updateStatus', async (req, res) => {
  const { id, status } = req.body;

  const query = `UPDATE login SET status = '${status}' WHERE id = ${id}`;
 await axios.get('http://192.168.1.239:3000/online_status', { timeout: 1000 });
  pool.query(query, (err, result) => {
    if (err) throw err;

    console.log('Status updated successfully!');  
    res.sendStatus(200);

    // Emit status change to connected clients
    io.emit('statusChange', { id, status });
  });
});

// Route for rendering the user interface
app.get('/online_status', (req, res) => {
  const query = 'SELECT * FROM login';

  pool.query(query, (err, result) => {
    if (err) throw err;

    const users = result;

    res.render('online_status', { users });
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New client connected.');

  // Send initial online/offline status to connected clients
  pool.query('SELECT id, status FROM login', (err, result) => {
    if (err) throw err;

    result.forEach((row) => {
      const { id, status } = row;
      io.emit('statusChange', { id, status });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected.');
  });
});

// Check online/offline status when network connection changes
io.on('connection', (socket) => {
  console.log('New client connected.');

  const sendStatusChange = (isOnline) => {
    pool.query('SELECT id FROM login', (err, result) => {
      if (err) throw err;

      result.forEach((row) => {
        const { id } = row;
        const status = isOnline ? '1' : '0';
        io.emit('statusChange', { id, status });
      });
    });
  };

  socket.on('disconnect', () => {
    sendStatusChange(false);
    console.log('Client disconnected.');
  });

  socket.on('connect', () => {
    sendStatusChange(true);
    console.log('Client connected.');
  });
});

http.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
