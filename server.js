const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.krrzr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose
  .connect(url, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() =>
    console.log('Connected to database\n-----------------------------')
  )
  .catch(err => console.log('Connection to database failed!'));

const port = process.env.PORT;
const server = app.listen(port, () =>
  console.log(`App running on port ${port}...`)
);

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 🔥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down...');
  server.close(() => {
    console.log('🔥 Process terminated.');
  });
});
