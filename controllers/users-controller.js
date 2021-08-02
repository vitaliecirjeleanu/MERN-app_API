const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const HttpError = require('../models/http-error');

exports.getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }
  res.status(200).json({
    status: 'success',
    quantity: users.length,
    users: users.map(user => user.toObject({ getters: true })),
  });
};

exports.signupUser = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please chek your data', 422)
    );
  }
  const { name, email, password } = req.body;

  try {
    const exsitingUser = await User.findOne({ email: email });

    if (exsitingUser)
      return next(
        new HttpError('Could not create a user, email already exists.', 422)
      );
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_PRIVATE_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(201).json({
    status: 'succes',
    userId: newUser.id,
    email: newUser.email,
    token,
  });
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new HttpError('Please provide email and password!', 400));

  let identifiedUser;

  try {
    identifiedUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError('Loggin in failed, please try again later', 500));
  }

  if (!identifiedUser) {
    return next(new HttpError('Incorrect email or password!', 403));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch (err) {
    return next(new HttpError('Loggin in failed, please try again later', 500));
  }

  if (!isValidPassword) {
    return next(new HttpError('Incorrect email or password!', 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: identifiedUser.id, email: identifiedUser.email },
      process.env.JWT_PRIVATE_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('Loggin in failed, please try again later', 500));
  }

  res.json({
    status: 'succes',
    userId: identifiedUser.id,
    email: identifiedUser.email,
    token,
  });
};
