var express = require('express');
var router = express.Router();
const userModel = require('./userModel');
const postModel = require('./postModel');
const passport = require('passport');
const upload = require('./multer')

const localStrategy = require('passport-local');
passport.use(new localStrategy(userModel.authenticate()))

// GET -> Sign Up Page.
router.get('/', function(req, res, next) {
  res.render('register', {footer: false});
});

// GET -> Log In Page.
router.get('/login', function(req, res, next) {
  res.render('login', {footer: false});
});

// GET -> User Profile page (user should be login)
router.get('/profile',isLoggedIn ,async function(req, res, next) {
  const loggedInUser = await userModel.findOne({username: req.session.passport.user}).populate('posts');
  res.render('profile', { user:loggedInUser, footer: true });
});

// POST -> Upload User Profile Picture (user should be login)
router.post('/upload-dp', isLoggedIn, upload.single('dpImage') ,async function(req, res, next) {
  const loggedInUser = await userModel.findOne({username: req.session.passport.user});
  loggedInUser.profileImage = req.file.filename;
  await loggedInUser.save()
  res.redirect('/edit');
});

// GET -> To Go to Upload Page To Upload LoggedIn User Post (user should be login)
router.get('/upload-post', isLoggedIn ,async function(req, res, next) {
  const loggedInUser = await userModel.findOne({username: req.session.passport.user});
  res.render("upload", {user:loggedInUser, footer: true})
});

// POST -> Create Post (user should be login)
router.post('/create-post',upload.single('postImage') ,isLoggedIn, async function(req,res,next){
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const newPost = await postModel.create({
    postImage: req.file.filename,
    caption: req.body.caption,
    user: loggedInUser._id
  })

  loggedInUser.posts.push(newPost._id);
  await loggedInUser.save();
  res.redirect('/feed')
})

// GET -> Feed Page in which all Post are visible (user should be login)
router.get('/feed', isLoggedIn, async function(req, res, next) {
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const allPosts = await postModel.find().populate('user');
  res.render('feed', { posts:allPosts, footer: true, user: loggedInUser});
});

// GET -> To Go to Edit Page To Edit LoggedIn User Profile details (user should be login)
router.get('/edit',isLoggedIn ,async function(req, res, next) {
  const loggedInUser = await userModel.findOne({username: req.session.passport.user});
  res.render("edit", {user:loggedInUser, footer: true})
});

// POST -> Update User Profile Details (user should be login)
router.post('/update-profile-details', isLoggedIn, upload.single('dpImage') ,async function(req, res, next) {
  const data = {
    name: req.body.name,
    bio: req.body.bio,
  }
  const User = await userModel.findOneAndUpdate({username: req.session.passport.user}, data ,{new: true});
  await User.save();
  res.redirect('/edit');
});

router.get('/search', isLoggedIn, async function(req, res, next){
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  res.render("search", {footer: true, user: loggedInUser})
})

router.get('/search/user/:username', isLoggedIn, async function(req, res, next){
  const searchTerm = `^${req.params.username}`;
  const regex = new RegExp(searchTerm);

  let users = await userModel.find({ username: { $regex: regex } });
  res.json(users);
})

// GET -> to visit any USER PROFILE
router.get('/profile/:user', isLoggedIn, async function(req, res, next){
  const username = req.params.user;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  let searchUser = await userModel.findOne({ username: username }).populate('posts');

  if(searchUser.username === loggedInUser.username){
    res.redirect('/profile')
  }
  res.render('userProfile', {searchUser, footer:true, user: loggedInUser })
})

router.get('/user/saved-post', isLoggedIn, async function(req, res, next){
  const loggedInUser = await userModel.findOne({username: req.session.passport.user}).populate('savedPost');
  res.render('savedPost', {footer:true, user:loggedInUser});
})

router.get('/user/liked-post', isLoggedIn, async function(req, res, next){
  const loggedInUser = await userModel.findOne({username: req.session.passport.user}).populate('likedPost');
  res.render('likedPost', {footer:true, user: loggedInUser});
})

// GET -> to Delete LoggedIn User Post
router.get('/post/delete/:postId', isLoggedIn, async function(req, res, next){
  const postId = req.params.postId;
  await postModel.findByIdAndDelete(postId)
  res.redirect('/feed')
})

router.get('/post/saved/:postId', isLoggedIn, async function(req, res, next){
  const postId = req.params.postId;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user});

  if(loggedInUser.savedPost.indexOf(postId) === -1){
    loggedInUser.savedPost.push(postId);
  }else{
    loggedInUser.savedPost.splice(loggedInUser.savedPost.indexOf(postId),1)
  }
  await loggedInUser.save();
  res.redirect("back")
})

router.get('/post/like/:postId', isLoggedIn, async function(req, res, next){
  const postId = req.params.postId;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const liked_Post = await postModel.findOne({_id: postId});

  if(liked_Post.likes.indexOf(loggedInUser._id) === -1){
    liked_Post.likes.push(loggedInUser._id)
    loggedInUser.likedPost.push(liked_Post._id);
  }else{
    liked_Post.likes.splice(liked_Post.likes.indexOf(loggedInUser._id),1)
    loggedInUser.likedPost.splice(loggedInUser.likedPost.indexOf(liked_Post._id),1)
  }

  await liked_Post.save()
  await loggedInUser.save()

  res.redirect('/feed')
})

router.get('/user/follow/:userid', isLoggedIn, async function(req,res,next){
  const userId = req.params.userid;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const searchUser = await userModel.findOne({_id: userId});

  if(searchUser.followers.indexOf(loggedInUser._id) === -1){
    searchUser.followers.push(loggedInUser._id);
    loggedInUser.following.push(searchUser._id)
  }else{
    searchUser.followers.splice(searchUser.followers.indexOf(loggedInUser._id), 1)
    loggedInUser.following.splice(loggedInUser.following.indexOf(searchUser._id),1);
  }
  await searchUser.save()
  await loggedInUser.save()
  res.redirect('back')
})

router.get('/user/followers/:userid', isLoggedIn, async function(req,res,next){
  const userid = req.params.userid;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const searchUser = await userModel.findOne({_id: userid}).populate('followers');
  res.render("followers", {footer:true, searchUser ,user: loggedInUser})
})

router.get('/user/following/:userid', isLoggedIn, async function(req,res,next){ 
  const userid = req.params.userid;
  const loggedInUser = await userModel.findOne({username: req.session.passport.user})
  const searchUser = await userModel.findOne({_id: userid}).populate('following');
  res.render("following", {footer:true, searchUser ,user: loggedInUser})
})

// Sing Up User
router.post('/register', function(req, res, next) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.username,
  })

  userModel.register(userData, req.body.password)
  .then(function(registeredUser){
    passport.authenticate("local")(req,res,function(){
      res.redirect('/feed')
    })
  })
  .catch(function(err){
    res.send(err.message)
  })
});

// Log In User
router.post('/login', passport.authenticate("local",{
  successRedirect: '/feed',
  failureRedirect: '/login'
}) ,function(req, res, next) {
});

// Log Out User
router.get('/logout' ,function(req, res, next){
  req.logout(function(err,next) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// Middleware to check user is login or not
function isLoggedIn(req,res ,next){
  if(req.isAuthenticated()){
    return next()
  }
  res.redirect('/login')
}

module.exports = router;
