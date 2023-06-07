const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a new PDF document
const doc = new PDFDocument();

// Pipe the PDF document to a writable stream
const writeStream = fs.createWriteStream('example.pdf');
doc.pipe(writeStream);

// Embed an image in the PDF
const imagePath = `assets/images/pk.jpg`; // Replace with the path to your image file
doc.image(imagePath, {
  fit: [250, 250], // Set the width and height of the image
  align: 'center',
  valign: 'center'
});

// Add text or other content to the PDF
doc.fontSize(16)
   .text('Example PDF with Image', { align: 'center' });

// Finalize the PDF and end the stream
doc.end();

// Handle the 'finish' event to know when the PDF generation is complete
writeStream.on('finish', () => {
  console.log('PDF created successfully!');
});
