const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
console.log('Resolving .env at:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Dotenv Error:', result.error);
} else {
  console.log('Dotenv loaded successfully');
  console.log('MONGODB_URI:', process.env.MONGODB_URI);
}
