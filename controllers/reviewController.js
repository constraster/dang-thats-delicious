const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
    req.body.author = req.user._id; //user id
    req.body.store = req.params.id; //url store id
    //save review
    const newReview = new Review(req.body);
    await newReview.save();
    req.flash('success', 'Review saved!');
    res.redirect('back');
};