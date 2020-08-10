const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
    //virtuals normally hidden, make it show with these 
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

//find reviews where stores _id property same as reviews store property
storeSchema.virtual('reviews', {
    ref: 'Review', //model to link
    localField: '_id', //which field on store
    foreignField: 'store' //which field on review
})

//define indices
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({location: '2dsphere'});

storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);

    //find other stores with same name
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`,'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
    //increment if duplicate 
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`
    }
    next();
})

storeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } }},
        { $sort: { count: -1 } }
    ]);
}

storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        //look up stores, populate reviews
        //takes model name ('Review') and lower-cases and appends 's'
        { $lookup: { from: 'reviews', localField: '_id',
            foreignField: 'store', as: 'reviews' }},
        //filter for items w/ 2+ reviews
        { $match: { 'reviews.1' : { $exists: true }}},
        //add avg reviews field
        { $project: {
            photo: '$$ROOT.photo',
            name: '$$ROOT.name',
            reviews: '$$ROOT.reviews',
            slug: '$$ROOT.slug',
            averageRating: { $avg: '$reviews.rating' }
        }},
        //sort it by new field (descending)
        { $sort: { averageRating: -1 }},
        //limit to 10
        { $limit: 10 }
    ]);
}

function autopopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findAll', autopopulate);

module.exports = mongoose.model('Store', storeSchema);