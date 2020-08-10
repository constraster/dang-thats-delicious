const passport = require('passport');
const User = require('../models/User');
const crypto = require('crypto');
const mongoose = require('mongoose');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    //check if user is authenticated
    if (req.isAuthenticated()) {
        next(); // they are logged in
        return;
    }

    //error otherwise
    req.flash('error', 'You must be logged in to do that');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    //check user w/ email exists
    const user = await User.findOne( { email: req.body.email });
    if (!user) {
        req.flash('error', 'A password been mailed to you.');
        return res.redirect('/login');
    }
    //set reset tokens and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; //1 hr
    await user.save();
    //send email w/ token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    
    await mail.send({
        user,
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'
    });
    
    req.flash('success', `You have been emailed a password reset link.`);
    //redirect to login
    res.redirect('/login');
};

exports.reset = async (req, res) => {
    const user = await User.findOne({ 
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/login');
    }

    //user exists, show reset form
    res.render('reset', { title: 'Reset your password' });
};

exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next(); //keep going
        return;
    }
    //fail
    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({ 
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/login');
    }

    //update db
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();

    await req.login(updatedUser); //login the user w/ passport
    req.flash('success', 'Your password has been reset!');
    res.redirect('/');
};