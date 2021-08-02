const fs = require('fs');

const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/placeModel');
const User = require('../models/userModel');
const HttpError = require('../models/http-error');

exports.getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (!place) {
    return next(
      new HttpError('Could not find a place with specified id.', 404)
    );
  }

  res.status(200).json({
    status: 'succes',
    place: place.toObject({ getters: true }),
  });
};

exports.getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userPlaces;
  try {
    userPlaces = await Place.find({ creator: userId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (!userPlaces || userPlaces.length === 0) {
    return next(
      new HttpError('Could not find a places for specified user id.', 404)
    );
  }

  res.status(200).json({
    status: 'succes',
    quantity: userPlaces.length,
    places: userPlaces.map(place => place.toObject({ getters: true })),
  });
};

exports.createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError('Invalid inputs passed, please chek your data', 422)
    );
  }

  const { title, description, address } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (err) {
    return next(err);
  }

  let user;

  try {
    user = await User.findById(req.userId);

    if (!user) {
      return next(new HttpError('Could not find a user for provided id'));
    }
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  const newPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userId,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPlace.save({ session: sess });
    user.places.push(newPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(201).json({
    status: 'success',
    data: newPlace,
  });
};

exports.updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please chek your data', 422)
    );
  }

  const placeId = req.params.pid;
  const { title: newTitle, description: newDescription } = req.body;
  let updatedPlace;

  try {
    updatedPlace = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (updatedPlace.creator.toString() !== req.userId) {
    return next(new HttpError('You are not allowed to edit this palce.', 401));
  }

  updatedPlace.title = newTitle;
  updatedPlace.description = newDescription;

  try {
    await updatedPlace.save();
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(201).json({
    status: 'success',
    place: updatedPlace.toObject({ getters: true }),
  });
};

exports.deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  try {
    const place = await Place.findById(placeId).populate('creator');
    if (!place) {
      return next(
        new HttpError('Could not find a place with specified id.', 404)
      );
    }

    if (place.creator.id !== req.userId) {
      return next(
        new HttpError('You are not allowed to delete this palce.', 401)
      );
    }

    const imagePath = place.image;

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();

    fs.unlink(imagePath, err =>
      console.log(`${err ? err : 'place image deleted.'}`)
    );
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.json({ status: 'success', message: 'Place deleted successfully!' });
};
