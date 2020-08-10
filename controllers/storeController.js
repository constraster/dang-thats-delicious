const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const { populate } = require('../models/User');


const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null,true);
        } else {
            next( { message: 'That filetype isn\'t allowed!'}, false );
        }
    }
};

exports.homePage = (req, res) => {
    console.log(req.name);
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    //check if no new file
    if (!req.file) {
        next(); //skip to next 
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    //resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;

    const store = await (new Store(req.body)).save();
    console.log('It worked');
    req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req,res) => {
    const page = req.params.page || 1;
    const limit = 4; // stores per page
    const skip = (page * limit) - limit; 
    //query db for list of all stores
    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' });
    const countPromise = Store.count();
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count/limit);
    if (!stores.length && skip) {
        req.flash('info', `Page does not exist, redirected to page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', {title: 'Stores', stores, page, pages, count });
};

//make a check
const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it');
    }
}

exports.editStore = async (req, res) => {
    //find store for id
    const store = await Store.findOne({ _id: req.params.id});
    //authenticate owner
    confirmOwner(store, req.user);
    //render edit form
    res.render('editStore', { title: `Edit ${store.name}`, store: store});
};

exports.updateStore = async (req, res) => {
    //set location data to be point
    req.body.location.type='Point';
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, 
        {new: true, runValidators: true}).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong>.
        <a href = "/stores/${store.slug}">View Store</a>`);
    res.redirect(`/stores/${store._id}/edit`)
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug}).populate('author reviews');
    //404 page
    if (!store) return next();
    res.render('store', {store, title: store.name});
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tag', { tag, tags, title: 'Tags', stores })
}

exports.searchStores = async (req, res) => {
    const stores = await Store
    //find stores that match
    .find({
        $text: {
            $search: req.query.q
        }
    }, {
        score: { $meta: 'textScore' }
    //sort descending
    }).sort({
        score: { $meta: 'textScore'}
    })
    //limit results
    .limit(5);
    res.json(stores);
};

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates,
                },
                $maxDistance: 10000
            }
        }
    }

    const stores = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(stores);
};

exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
    //get list of hearted stores
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
        .findByIdAndUpdate(req.user._id,
            { [operator]: { hearts: req.params.id }},
            { new: true }
    );
    res.json(user);
};

exports.getHearts = async (res, req) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts } //find id in array
    });
    res.render('stores', { title: 'Hearted Stores', stores});
};

exports.getTopStores = async (req, res) => {
    //keep complex aggregation to model
    const stores = await Store.getTopStores();
    res.render('topStores', { stores, title: 'Top Scores!' });
};